"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, OK, protegida, type ResultadoDaAcao } from "@/lib/acoes";
import { consolidarIngredientes } from "@/lib/ingredientes";
import { createClient } from "@/lib/supabase/server";
import { normalizarTexto } from "@/lib/texto";
import { receitaSchema, type ReceitaInput } from "./schemas";

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
  return protegida("Não consegui importar essa receita.", async () => {
    const validado = idSchema.safeParse(receitaId);
    if (!validado.success) return falha("Receita inválida.");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return falha("Sua sessão expirou. Entre de novo.");

    const { data: original } = await supabase
      .from("recipes")
      .select(
        "nome, descricao, modo_preparo, calorias, tempo_preparo, porcoes, imagem_url, recipe_ingredients(ingredient_id, quantidade, unidade)",
      )
      .eq("id", validado.data)
      .is("user_id", null)
      .maybeSingle();

    if (!original) return falha("Essa receita não está mais no catálogo.");

    const { data: minhas } = await supabase
      .from("recipes")
      .select("nome")
      .eq("user_id", user.id);

    const repetida = (minhas ?? []).some(
      (receita) =>
        normalizarTexto(receita.nome) === normalizarTexto(original.nome),
    );

    if (repetida) {
      return falha(`Você já tem uma receita chamada "${original.nome}".`);
    }

    const { recipe_ingredients: ingredientes, ...campos } = original;

    const { data: copia, error: erroDaCopia } = await supabase
      .from("recipes")
      .insert({ ...campos, user_id: user.id })
      .select("id")
      .maybeSingle();

    if (erroDaCopia || !copia) {
      return falha("Não consegui importar. Tente de novo.");
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
        return falha("Não consegui importar. Tente de novo.");
      }
    }

    revalidatePath("/sugestoes");
    revalidatePath("/receitas");
    revalidatePath("/dashboard");

    return OK;
  });
}

/**
 * Cria uma receita do usuário, com os ingredientes que ele informou.
 *
 * Os ingredientes passam por `obter_ou_criar_ingrediente`: o catálogo é
 * compartilhado, e a lista de compras soma por `ingredient_id`, então
 * "Azeite de oliva" precisa cair sempre na mesma linha. A função devolve o id
 * do que já existe e cria só o que falta.
 *
 * Se a ligação com os ingredientes falhar, a receita recém-criada é apagada —
 * receita sem ingrediente não soma nada na lista e viraria um fantasma.
 */
export async function criarReceita(
  entrada: ReceitaInput,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui salvar essa receita.", async () => {
    const validado = receitaSchema.safeParse(entrada);
    if (!validado.success) {
      return falha(validado.error.issues[0]?.message ?? "Dados inválidos.");
    }

    const { ingredientes, descricao, ...campos } = validado.data;

    let consolidados;
    try {
      consolidados = consolidarIngredientes(ingredientes, "Nesta receita");
    } catch (erro) {
      return falha(
        erro instanceof Error ? erro.message : "Ingredientes inválidos.",
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return falha("Sua sessão expirou. Entre de novo.");

    const { data: minhas } = await supabase
      .from("recipes")
      .select("nome")
      .eq("user_id", user.id);

    const repetida = (minhas ?? []).some(
      (receita) => normalizarTexto(receita.nome) === normalizarTexto(campos.nome),
    );

    if (repetida) {
      return falha(`Você já tem uma receita chamada "${campos.nome}".`);
    }

    const ids = await Promise.all(
      consolidados.map(async (item) => {
        const { data, error } = await supabase.rpc(
          "obter_ou_criar_ingrediente",
          { p_nome: item.nome, p_unidade: item.unidade },
        );

        if (error || !data) {
          throw new Error(`Não consegui registrar "${item.nome}".`);
        }

        return data;
      }),
    );

    const { data: criada, error: erroDaReceita } = await supabase
      .from("recipes")
      .insert({
        ...campos,
        descricao: descricao?.trim() ? descricao.trim() : null,
        user_id: user.id,
      })
      .select("id")
      .maybeSingle();

    if (erroDaReceita || !criada) {
      return falha("Não consegui salvar essa receita. Tente de novo.");
    }

    const { error: erroDosIngredientes } = await supabase
      .from("recipe_ingredients")
      .insert(
        consolidados.map((item, indice) => ({
          recipe_id: criada.id,
          ingredient_id: ids[indice],
          quantidade: item.quantidade,
          unidade: item.unidade,
        })),
      );

    if (erroDosIngredientes) {
      await supabase.from("recipes").delete().eq("id", criada.id);
      return falha("Não consegui salvar os ingredientes. Tente de novo.");
    }

    revalidatePath("/receitas");
    revalidatePath("/sugestoes");
    revalidatePath("/dashboard");

    return OK;
  });
}

/**
 * Apaga uma receita do usuário.
 *
 * Os horários que a usavam ficam vazios — `plan_slots.recipe_id` é
 * `on delete set null` —, e o gatilho refaz a lista de compras. O catálogo
 * global não é afetado: a RLS só permite apagar o que tem `user_id` próprio.
 */
export async function excluirReceita(
  receitaId: string,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui apagar essa receita.", async () => {
    const validado = idSchema.safeParse(receitaId);
    if (!validado.success) return falha("Receita inválida.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", validado.data)
      .not("user_id", "is", null)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return falha("Essa receita não é sua para apagar.");
    }

    revalidatePath("/receitas");
    revalidatePath("/sugestoes");
    revalidatePath("/dashboard");
    revalidatePath("/lista-compras");

    return OK;
  });
}
