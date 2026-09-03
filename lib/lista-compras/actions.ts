"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const alternarSchema = z.object({
  id: z.string().uuid("Item inválido"),
  comprado: z.boolean(),
});

export interface ResultadoDaLista {
  erro?: string;
}

/**
 * Marca ou desmarca um item como comprado.
 *
 * Não há verificação de dono aqui de propósito: a política de RLS já limita a
 * linha ao usuário da sessão, e o privilégio de coluna impede que qualquer
 * outra coisa além de `comprado` seja alterada. O servidor confia na fronteira
 * que o banco impõe, não em uma checagem repetida na aplicação.
 */
export async function alternarComprado(
  entrada: z.input<typeof alternarSchema>,
): Promise<ResultadoDaLista> {
  const validado = alternarSchema.safeParse(entrada);
  if (!validado.success) {
    return { erro: "Não consegui atualizar esse item." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_list")
    .update({ comprado: validado.data.comprado })
    .eq("id", validado.data.id);

  if (error) {
    return { erro: "Não consegui atualizar esse item." };
  }

  revalidatePath("/lista-compras");
  revalidatePath("/dashboard");

  return {};
}
