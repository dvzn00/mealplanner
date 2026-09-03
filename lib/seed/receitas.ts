import { z } from "zod";

/**
 * Formato do `receitas-seed.json` e as transformações puras que o script de
 * seed aplica antes de falar com o banco. Ficam separadas do script para
 * poderem ser testadas sem precisar de um projeto Supabase.
 */

const ingredienteSeedSchema = z.object({
  nome: z.string().trim().min(1, "o ingrediente precisa de um nome"),
  quantidade: z.number().positive("a quantidade precisa ser maior que zero"),
  unidade: z.string().trim().min(1, "informe a unidade"),
});

const receitaSeedSchema = z.object({
  nome: z.string().trim().min(1, "a receita precisa de um nome"),
  descricao: z.string().trim().optional(),
  modo_preparo: z.string().trim().min(1, "descreva o modo de preparo"),
  tempo_preparo: z.number().int().positive("tempo de preparo em minutos"),
  porcoes: z.number().int().positive("quantas porções a receita rende"),
  calorias: z.number().int().nonnegative("calorias não pode ser negativo"),
  imagem_url: z.string().url().optional(),
  ingredientes: z
    .array(ingredienteSeedSchema)
    .min(1, "a receita precisa de pelo menos um ingrediente"),
});

export const receitasSeedSchema = z
  .array(receitaSeedSchema)
  .min(1, "o arquivo não tem nenhuma receita");

export type IngredienteSeed = z.infer<typeof ingredienteSeedSchema>;
export type ReceitaSeed = z.infer<typeof receitaSeedSchema>;

/**
 * Chave de comparação de ingredientes. É `lower(nome)` de propósito: é
 * exatamente o índice único que existe na tabela `ingredients`. Normalizar
 * mais que o banco (tirando acento, por exemplo) faria o script juntar dois
 * ingredientes que o banco considera diferentes.
 */
export function chaveDoIngrediente(nome: string): string {
  return nome.trim().toLowerCase();
}

export interface IngredienteDoCatalogo {
  nome: string;
  unidade_padrao: string;
}

/**
 * O catálogo de ingredientes que as receitas exigem, sem repetição.
 *
 * A unidade padrão é a da primeira aparição. Quem cita "Azeite de oliva" em ml
 * na primeira receita define ml como padrão do catálogo — e as outras receitas
 * seguem livres para usar outra unidade na própria linha.
 */
export function catalogoDeIngredientes(
  receitas: ReceitaSeed[],
): IngredienteDoCatalogo[] {
  const porChave = new Map<string, IngredienteDoCatalogo>();

  for (const receita of receitas) {
    for (const ingrediente of receita.ingredientes) {
      const chave = chaveDoIngrediente(ingrediente.nome);
      if (!porChave.has(chave)) {
        porChave.set(chave, {
          nome: ingrediente.nome.trim(),
          unidade_padrao: ingrediente.unidade.trim(),
        });
      }
    }
  }

  return [...porChave.values()];
}

export interface IngredienteConsolidado {
  chave: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

/**
 * Os ingredientes de uma receita, com repetições resolvidas.
 *
 * `recipe_ingredients` tem UNIQUE(recipe_id, ingredient_id), então a mesma
 * receita não pode listar o mesmo ingrediente duas vezes. Quantidades na mesma
 * unidade são somadas. Unidades diferentes levantam erro em vez de conversão
 * às cegas: converter errado estraga a lista de compras em silêncio.
 */
export function consolidarIngredientes(
  receita: ReceitaSeed,
): IngredienteConsolidado[] {
  const porChave = new Map<string, IngredienteConsolidado>();

  for (const ingrediente of receita.ingredientes) {
    const chave = chaveDoIngrediente(ingrediente.nome);
    const unidade = ingrediente.unidade.trim();
    const existente = porChave.get(chave);

    if (!existente) {
      porChave.set(chave, {
        chave,
        nome: ingrediente.nome.trim(),
        quantidade: ingrediente.quantidade,
        unidade,
      });
      continue;
    }

    if (existente.unidade !== unidade) {
      throw new Error(
        `Receita "${receita.nome}": "${existente.nome}" aparece em ${existente.unidade} e em ${unidade}. ` +
          "Escolha uma unidade para os dois — o seed não converte por conta própria.",
      );
    }

    existente.quantidade += ingrediente.quantidade;
  }

  return [...porChave.values()];
}
