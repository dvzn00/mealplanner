/**
 * Identidade e consolidação de ingredientes.
 *
 * Usado pelo seed do catálogo e pelo formulário de receita própria — os dois
 * precisam responder "isto é o mesmo ingrediente?" e "o que fazer quando o
 * mesmo ingrediente aparece duas vezes na mesma receita?".
 */

export interface IngredienteInformado {
  nome: string;
  quantidade: number;
  unidade: string;
}

export interface IngredienteConsolidado extends IngredienteInformado {
  chave: string;
}

/**
 * Chave de comparação. É `lower(nome)` de propósito: é exatamente o índice
 * único que existe na tabela `ingredients`. Normalizar mais que o banco —
 * tirando acento, por exemplo — juntaria dois ingredientes que o banco
 * considera diferentes.
 */
export function chaveDoIngrediente(nome: string): string {
  return nome.trim().toLowerCase();
}

/**
 * Resolve o mesmo ingrediente citado mais de uma vez.
 *
 * `recipe_ingredients` tem UNIQUE(recipe_id, ingredient_id), então a receita
 * não pode listar o mesmo ingrediente duas vezes. Quantidades na mesma unidade
 * são somadas. Unidades diferentes levantam erro em vez de conversão às cegas:
 * converter errado estraga a lista de compras em silêncio.
 */
export function consolidarIngredientes(
  itens: IngredienteInformado[],
  ondeAconteceu: string,
): IngredienteConsolidado[] {
  const porChave = new Map<string, IngredienteConsolidado>();

  for (const item of itens) {
    const chave = chaveDoIngrediente(item.nome);
    const unidade = item.unidade.trim();
    const existente = porChave.get(chave);

    if (!existente) {
      porChave.set(chave, {
        chave,
        nome: item.nome.trim(),
        quantidade: item.quantidade,
        unidade,
      });
      continue;
    }

    if (existente.unidade !== unidade) {
      throw new Error(
        `${ondeAconteceu}: "${existente.nome}" aparece em ${existente.unidade} e em ${unidade}. ` +
          "Escolha uma unidade para os dois — não dá para converter por conta própria.",
      );
    }

    existente.quantidade += item.quantidade;
  }

  return [...porChave.values()];
}
