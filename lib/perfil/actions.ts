"use server";

import { revalidatePath } from "next/cache";
import {
  perfilSchema,
  type PerfilInput,
  type ResultadoDeFormulario,
} from "@/lib/auth/schemas";
import { createClient } from "@/lib/supabase/server";

export async function atualizarPerfil(
  entrada: PerfilInput,
): Promise<ResultadoDeFormulario> {
  const validado = perfilSchema.safeParse(entrada);
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Nome inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Sua sessão expirou. Entre de novo." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nome: validado.data.nome })
    .eq("id", user.id);

  if (error) {
    return { erro: "Não consegui salvar seu nome. Tente de novo." };
  }

  // O nome aparece na navbar, que vive no layout.
  revalidatePath("/", "layout");

  return { sucesso: "Nome atualizado." };
}
