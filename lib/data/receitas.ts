import type { ReceitaDoSlot } from "@/lib/data/planejamento";
import type { ReceitaInput } from "@/lib/receitas/schemas";
import { createClient } from "@/lib/supabase/server";
import { normalizarTexto } from "@/lib/texto";

export interface ReceitaDaLista {
  id: string;
  nome: string;
  descricao: string | null;
  calorias: number;
  tempo_preparo: number;
  porcoes: number;
  imagem_url: string | null;
  /** `true` quando é receita do próprio usuário, `false` no catálogo global. */
  propria: boolean;
}

interface ComDono {
  nome: string;
  user_id: string | null;
}

/**
 * Esconde a receita do catálogo quando o usuário já tem uma cópia com o mesmo
 * nome.
 *
 * Sem isso, importar uma sugestão faria a receita aparecer duas vezes no painel
 * de arraste — a do catálogo e a sua — com o mesmo nome e nenhuma pista de qual
 * é qual. Importar significa "esta agora é minha".
 */
function semDuplicatasDoCatalogo<T extends ComDono>(
  receitas: T[],
  usuarioId: string,
): T[] {
  const minhas = new Set(
    receitas
      .filter((receita) => receita.user_id === usuarioId)
      .map((receita) => normalizarTexto(receita.nome)),
  );

  return receitas.filter(
    (receita) =>
      receita.user_id !== null || !minhas.has(normalizarTexto(receita.nome)),
  );
}

/**
 * As receitas que o usuário enxerga: as dele e as globais que ele ainda não
 * importou.
 *
 * A RLS já faz o recorte por dono — a política de leitura de `recipes` aceita
 * `user_id is null or user_id = auth.uid()`. Aqui só decidimos a ordem, a
 * marca de quais são dele e o descarte das duplicatas.
 */
export async function listarReceitas(
  usuarioId: string,
): Promise<ReceitaDaLista[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, nome, descricao, calorias, tempo_preparo, porcoes, imagem_url, user_id",
    )
    .order("nome");

  if (error || !data) return [];

  return semDuplicatasDoCatalogo(data, usuarioId).map(
    ({ user_id, ...receita }) => ({
      ...receita,
      propria: user_id === usuarioId,
    }),
  );
}

/**
 * O que o painel de arraste e o seletor do diálogo precisam saber de cada
 * receita. Uma consulta só serve os dois.
 */
export async function listarReceitasParaArrastar(): Promise<ReceitaDoSlot[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("recipes")
    .select("id, nome, calorias, imagem_url, user_id")
    .order("nome");

  if (!data) return [];

  const visiveis = user ? semDuplicatasDoCatalogo(data, user.id) : data;

  return visiveis.map(({ user_id, ...receita }) => receita);
}

/**
 * Os nomes do catálogo, para a lista de sugestões do formulário.
 *
 * Sugerir o que já existe é o que mantém a lista de compras somando certo:
 * quem escolhe "Azeite de oliva" da lista cai no mesmo `ingredient_id` que
 * as receitas do catálogo usam.
 */
export async function listarNomesDeIngredientes(): Promise<string[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ingredients")
    .select("nome")
    .order("nome");

  return (data ?? []).map((ingrediente) => ingrediente.nome);
}

export interface ReceitaParaEdicao {
  id: string;
  valores: ReceitaInput;
}

/**
 * Uma receita do usuário, no formato que o formulário espera.
 *
 * Devolve `null` para receita do catálogo ou de outra pessoa — a RLS já
 * esconde a de terceiros, e a global é de leitura para todos. Quem chama
 * transforma isso em 404 em vez de abrir um formulário que não vai salvar.
 */
export async function obterReceitaParaEdicao(
  id: string,
): Promise<ReceitaParaEdicao | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("recipes")
    .select(
      "id, nome, descricao, modo_preparo, calorias, tempo_preparo, porcoes, user_id, recipe_ingredients(quantidade, unidade, ingredients(nome))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data || data.user_id !== user.id) return null;

  return {
    id: data.id,
    valores: {
      nome: data.nome,
      descricao: data.descricao ?? "",
      modo_preparo: data.modo_preparo,
      calorias: data.calorias,
      tempo_preparo: data.tempo_preparo,
      porcoes: data.porcoes,
      ingredientes: data.recipe_ingredients.map((ligacao) => ({
        nome: ligacao.ingredients?.nome ?? "",
        quantidade: ligacao.quantidade,
        unidade: ligacao.unidade,
      })),
    },
  };
}
