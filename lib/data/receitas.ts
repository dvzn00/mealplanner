import type { ReceitaDoSlot } from "@/lib/data/planejamento";
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

/**
 * O que o painel de arraste e o seletor do diálogo precisam saber de cada
 * receita. Uma consulta só serve os dois: o seletor usa nome e id, o painel
 * mostra também as calorias.
 */
export async function listarReceitasParaArrastar(): Promise<ReceitaDoSlot[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("recipes")
    .select("id, nome, calorias, imagem_url")
    .order("nome");

  return data ?? [];
}
