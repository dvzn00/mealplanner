"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * As duas decisões que o usuário toma sobre a lista.
 *
 * Não há verificação de dono aqui de propósito: a política de RLS já limita a
 * linha ao usuário da sessão, e o privilégio de coluna impede que qualquer
 * coisa além de `comprado` e `ignorado` seja alterada. O servidor confia na
 * fronteira que o banco impõe, não em uma checagem repetida na aplicação.
 */

const decisaoSchema = z.object({
  id: z.string().uuid("Item inválido"),
  valor: z.boolean(),
});

export interface ResultadoDaLista {
  sucesso: boolean;
  erro?: string;
}

async function marcar(
  id: string,
  valor: boolean,
  coluna: "comprado" | "ignorado",
  mensagemDeErro: string,
): Promise<ResultadoDaLista> {
  const validado = decisaoSchema.safeParse({ id, valor });
  if (!validado.success) {
    return { sucesso: false, erro: mensagemDeErro };
  }

  // Objeto explícito em vez de chave computada: com `{ [coluna]: valor }` o
  // TypeScript perde o literal e o tipo do update deixa de bater.
  const mudanca =
    coluna === "comprado"
      ? { comprado: validado.data.valor }
      : { ignorado: validado.data.valor };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list")
    .update(mudanca)
    .eq("id", validado.data.id);

  if (error) {
    return { sucesso: false, erro: mensagemDeErro };
  }

  revalidatePath("/lista-compras");

  return { sucesso: true };
}

export async function alternarComprado(
  id: string,
  comprado: boolean,
): Promise<ResultadoDaLista> {
  return marcar(id, comprado, "comprado", "Não consegui marcar esse item.");
}

/**
 * Tira o item da lista sem tirar a receita do plano — para o sal que já está
 * na despensa. A marca sobrevive ao recálculo do gatilho.
 */
export async function alternarDispensado(
  id: string,
  ignorado: boolean,
): Promise<ResultadoDaLista> {
  return marcar(id, ignorado, "ignorado", "Não consegui dispensar esse item.");
}
