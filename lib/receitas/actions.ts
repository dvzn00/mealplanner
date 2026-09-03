"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizarTexto } from "@/lib/texto";
import type { ResultadoDaAcao } from "@/lib/planejamento/schemas";

const idSchema = z.string().uuid("Receita inválida");

/**
 * Copia uma receita do catálogo para as receitas do usuário.
 *
 * A cópia é independente da original: editar a sua não mexe no catálogo, e uma
 * mudança no catálogo não te alcança. É esse o ponto de importar.
 *
 * Se a ligação com os ingredientes falhar, a receita recém-criada é apagada.
 * Receita sem ingrediente não soma nada na lista de compras e viraria um
 * fantasma que a pessoa não entende.
 */
export async function importarReceita(
  receitaId: string,
): Promise<ResultadoDaAcao> {
  const validado = idSchema.safeParse(receitaId);
  if (!validado.success) {
    return { sucesso: false, erro: "Receita inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { sucesso: false, erro: "Sua sessão expirou. Entre de novo." };
  }

  const { data: original } = await supabase
    .from("recipes")
    .select(
      "nome, descricao, modo_preparo, calorias, tempo_preparo, porcoes, imagem_url, recipe_ingredients(ingredient_id, quantidade, unidade)",
    )
    .eq("id", validado.data)
    .is("user_id", null)
    .maybeSingle();

  if (!original) {
    return { sucesso: false, erro: "Essa receita não está mais no catálogo." };
  }

  const { data: minhas } = await supabase
    .from("recipes")
    .select("nome")
    .eq("user_id", user.id);

  const repetida = (minhas ?? []).some(
    (receita) => normalizarTexto(receita.nome) === normalizarTexto(original.nome),
  );

  if (repetida) {
    return {
      sucesso: false,
      erro: `Você já tem uma receita chamada "${original.nome}".`,
    };
  }

  const { recipe_ingredients: ingredientes, ...campos } = original;

  const { data: copia, error: erroDaCopia } = await supabase
    .from("recipes")
    .insert({ ...campos, user_id: user.id })
    .select("id")
    .maybeSingle();

  if (erroDaCopia || !copia) {
    return { sucesso: false, erro: "Não consegui importar. Tente de novo." };
  }

  if (ingredientes.length > 0) {
    const { error } = await supabase.from("recipe_ingredients").insert(
      ingredientes.map((item) => ({
        recipe_id: copia.id,
        ingredient_id: item.ingredient_id,
        quantidade: item.quantidade,
        unidade: item.unidade,
      })),
    );

    if (error) {
      await supabase.from("recipes").delete().eq("id", copia.id);
      return { sucesso: false, erro: "Não consegui importar. Tente de novo." };
    }
  }

  revalidatePath("/sugestoes");
  revalidatePath("/receitas");
  revalidatePath("/dashboard");

  return { sucesso: true };
}
