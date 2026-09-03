import { normalizarTexto } from "@/lib/texto";
import { createClient } from "@/lib/supabase/server";

export interface Sugestao {
  id: string;
  nome: string;
  descricao: string | null;
  calorias: number;
  tempo_preparo: number;
  porcoes: number;
  ingredientes: string[];
  /** Já existe uma receita do usuário com este nome. */
  jaImportada: boolean;
}

/**
 * O catálogo global, com os ingredientes de cada receita para a busca.
 *
 * "Já importada" é reconhecido pelo nome, não por uma coluna de origem. É
 * frágil se a pessoa renomear a cópia — mas o custo da alternativa é uma
 * migração e uma chave estrangeira para responder "você já tem uma receita
 * chamada assim", que é exatamente o que o nome já responde.
 */
export async function listarSugestoes(usuarioId: string): Promise<Sugestao[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .select(
      "id, nome, descricao, calorias, tempo_preparo, porcoes, user_id, recipe_ingredients(ingredients(nome))",
    )
    .order("nome");

  if (error || !data) return [];

  const minhas = new Set(
    data
      .filter((receita) => receita.user_id === usuarioId)
      .map((receita) => normalizarTexto(receita.nome)),
  );

  return data
    .filter((receita) => receita.user_id === null)
    .map(({ user_id, recipe_ingredients, ...receita }) => ({
      ...receita,
      ingredientes: (recipe_ingredients ?? [])
        .map((ligacao) => ligacao.ingredients?.nome)
        .filter((nome): nome is string => Boolean(nome)),
      jaImportada: minhas.has(normalizarTexto(receita.nome)),
    }));
}
