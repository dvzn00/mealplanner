"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  exigirLinha,
  falha,
  OK,
  protegida,
  type ResultadoDaAcao,
} from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";

/**
 * As duas decisões que o usuário toma sobre a lista.
 *
 * Não há checagem de dono aqui: a política de RLS já limita a linha ao usuário
 * da sessão, e o privilégio de coluna impede que qualquer coisa além de
 * `comprado` e `ignorado` seja alterada. O que a ação faz é conferir que a
 * escrita alcançou uma linha — com RLS, mexer na linha alheia afeta zero
 * linhas sem erro, e a interface diria "marcado" sem ter marcado nada.
 */

const decisaoSchema = z.object({
  id: z.string().uuid("Item inválido"),
  valor: z.boolean(),
});

async function marcar(
  id: string,
  valor: boolean,
  coluna: "comprado" | "ignorado",
  mensagemDeErro: string,
): Promise<ResultadoDaAcao> {
  return protegida(mensagemDeErro, async () => {
    const validado = decisaoSchema.safeParse({ id, valor });
    if (!validado.success) return falha(mensagemDeErro);

    // Objeto explícito em vez de chave computada: com `{ [coluna]: valor }` o
    // TypeScript perde o literal e o tipo do update deixa de bater.
    const mudanca =
      coluna === "comprado"
        ? { comprado: validado.data.valor }
        : { ignorado: validado.data.valor };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("shopping_list")
      .update(mudanca)
      .eq("id", validado.data.id)
      .select("id")
      .maybeSingle();

    const semLinha = exigirLinha(error ? null : data, mensagemDeErro);
    if (semLinha) return semLinha;

    revalidatePath("/lista-compras");

    return OK;
  });
}

export async function alternarComprado(
  id: string,
  comprado: boolean,
): Promise<ResultadoDaAcao> {
  return marcar(id, comprado, "comprado", "Não consegui marcar esse item.");
}

/**
 * Tira o item da lista sem tirar a receita do plano — para o sal que já está
 * na despensa. A marca sobrevive ao recálculo do gatilho.
 */
export async function alternarDispensado(
  id: string,
  ignorado: boolean,
): Promise<ResultadoDaAcao> {
  return marcar(id, ignorado, "ignorado", "Não consegui dispensar esse item.");
}
