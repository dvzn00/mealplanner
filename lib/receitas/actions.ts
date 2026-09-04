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
      (receita) =>
        normalizarTexto(receita.nome) === normalizarTexto(campos.nome),
    );

    if (repetida) {
      return falha(`Você já tem uma receita chamada "${campos.nome}".`);
    }

    const ids = await resolverIngredientes(supabase, consolidados);

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

type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * Troca os nomes informados por ids do catálogo, criando o que faltar.
 *
 * É por aqui que a receita nova cai no mesmo "Azeite de oliva" das prontas —
 * o que mantém a soma da lista de compras correta.
 */
async function resolverIngredientes(
  supabase: Cliente,
  itens: { nome: string; unidade: string }[],
): Promise<string[]> {
  return Promise.all(
    itens.map(async (item) => {
      const { data, error } = await supabase.rpc("obter_ou_criar_ingrediente", {
        p_nome: item.nome,
        p_unidade: item.unidade,
      });

      if (error || !data) {
        throw new Error(`Não consegui registrar "${item.nome}".`);
      }

      return data;
    }),
  );
}

/**
 * Atualiza uma receita do usuário e a lista de ingredientes dela.
 *
 * Os ingredientes são gravados por `upsert` e só depois o que sobrou é
 * apagado: assim a receita nunca fica sem ingrediente nenhum entre as duas
 * requisições. O gatilho de `recipe_ingredients` refaz a lista de compras de
 * toda semana que use esta receita.
 */
export async function atualizarReceita(
  receitaId: string,
  entrada: ReceitaInput,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui salvar essa receita.", async () => {
    const id = idSchema.safeParse(receitaId);
    if (!id.success) return falha("Receita inválida.");

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
      .select("id, nome")
      .eq("user_id", user.id);

    const repetida = (minhas ?? []).some(
      (receita) =>
        receita.id !== id.data &&
        normalizarTexto(receita.nome) === normalizarTexto(campos.nome),
    );

    if (repetida) {
      return falha(`Você já tem outra receita chamada "${campos.nome}".`);
    }

    // `not user_id is null` mantém o catálogo global fora do alcance; a RLS
    // já cuida das receitas de outras pessoas.
    const { data: atualizada, error: erroDaReceita } = await supabase
      .from("recipes")
      .update({
        ...campos,
        descricao: descricao?.trim() ? descricao.trim() : null,
      })
      .eq("id", id.data)
      .not("user_id", "is", null)
      .select("id")
      .maybeSingle();

    if (erroDaReceita || !atualizada) {
      return falha("Essa receita não é sua para editar.");
    }

    const ids = await resolverIngredientes(supabase, consolidados);

    const { error: erroDoUpsert } = await supabase
      .from("recipe_ingredients")
      .upsert(
        consolidados.map((item, indice) => ({
          recipe_id: atualizada.id,
          ingredient_id: ids[indice],
          quantidade: item.quantidade,
          unidade: item.unidade,
        })),
        { onConflict: "recipe_id,ingredient_id" },
      );

    if (erroDoUpsert) {
      return falha("Não consegui salvar os ingredientes. Tente de novo.");
    }

    const { error: erroDaLimpeza } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", atualizada.id)
      .not("ingredient_id", "in", `(${ids.join(",")})`);

    if (erroDaLimpeza) {
      return falha("Não consegui tirar os ingredientes removidos.");
    }

    revalidatePath("/receitas");
    revalidatePath("/dashboard");
    revalidatePath("/lista-compras");

    return OK;
  });
}

/**
 * Marca ou desmarca uma receita como favorita.
 *
 * As favoritas são o que o painel de arraste mostra. O catálogo cresce e a
 * faixa não estica: sem um recorte escolhido pela pessoa, ela exibia as
 * primeiras receitas em ordem alfabética, que é um critério que não interessa
 * a ninguém — e no celular só duas cabiam.
 *
 * Favoritar é `insert` com `ignoreDuplicates`, e não um "ler, decidir, gravar":
 * dois toques rápidos no mesmo botão não podem virar erro de chave duplicada.
 * O `user_id` vem da sessão, nunca do cliente — a política de `with check`
 * recusaria de qualquer jeito, mas mandar o certo evita depender disso.
 */
export async function alternarFavorita(
  receitaId: string,
  favoritar: boolean,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui mudar a favorita.", async () => {
    const validado = idSchema.safeParse(receitaId);
    if (!validado.success) return falha("Receita inválida.");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return falha("Faça login de novo para continuar.");

    const { error } = favoritar
      ? await supabase
          .from("recipe_favorites")
          .upsert(
            { user_id: user.id, recipe_id: validado.data },
            { onConflict: "user_id,recipe_id", ignoreDuplicates: true },
          )
      : await supabase
          .from("recipe_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("recipe_id", validado.data);

    if (error) {
      return falha(
        favoritar
          ? "Não consegui favoritar essa receita."
          : "Não consegui tirar essa receita das favoritas.",
      );
    }

    revalidatePath("/receitas");
    revalidatePath("/dashboard");

    return OK;
  });
}
