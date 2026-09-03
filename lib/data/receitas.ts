import { createClient } from "@/lib/supabase/server";

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

/**
 * As receitas que o usuário enxerga: as dele e as globais.
 *
 * A RLS já faz esse recorte — a política de leitura de `recipes` aceita
 * `user_id is null or user_id = auth.uid()`. Aqui só decidimos a ordem e
 * marcamos quais são dele.
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

  return data.map(({ user_id, ...receita }) => ({
    ...receita,
    propria: user_id === usuarioId,
  }));
}

export interface ReceitaParaEscolha {
  id: string;
  nome: string;
}

/** Só o necessário para o seletor do diálogo de refeição. */
export async function listarReceitasParaEscolha(): Promise<
  ReceitaParaEscolha[]
> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("recipes")
    .select("id, nome")
    .order("nome");

  return data ?? [];
}
