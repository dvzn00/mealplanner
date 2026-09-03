"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROTA_APOS_LOGIN, ROTA_LOGIN } from "@/lib/supabase/routes";
import {
  cadastrarSchema,
  destinoSeguro,
  entrarSchema,
  type CadastrarInput,
  type EntrarInput,
  type ResultadoDeFormulario,
} from "./schemas";

/**
 * As mensagens do Supabase chegam em inglês e falando de "credentials".
 * Traduzimos as que a pessoa pode encontrar; o resto vira uma frase honesta em
 * vez de um código. Nada de senha ou token entra em log — nem aqui, nem no
 * retorno.
 */
function traduzirErro(mensagem: string): string {
  const conhecidos: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "Email not confirmed":
      "Confirme seu e-mail pelo link que enviamos antes de entrar.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Password should be at least 6 characters.":
      "A senha precisa de pelo menos 6 caracteres.",
  };

  return conhecidos[mensagem] ?? "Não foi possível concluir. Tente de novo.";
}

async function origemDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";

  return `${protocolo}://${host}`;
}

export async function entrar(
  entrada: EntrarInput,
): Promise<ResultadoDeFormulario> {
  const validado = entrarSchema.safeParse(entrada);
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validado.data.email,
    password: validado.data.senha,
  });

  if (error) {
    return { erro: traduzirErro(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(destinoSeguro(validado.data.proximo, ROTA_APOS_LOGIN));
}

export async function cadastrar(
  entrada: CadastrarInput,
): Promise<ResultadoDeFormulario> {
  const validado = cadastrarSchema.safeParse(entrada);
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: validado.data.email,
    password: validado.data.senha,
    options: {
      // Vira raw_user_meta_data, de onde o gatilho tira o nome do perfil.
      data: { nome: validado.data.nome },
      emailRedirectTo: `${await origemDaRequisicao()}/auth/confirmar`,
    },
  });

  if (error) {
    return { erro: traduzirErro(error.message) };
  }

  // Com confirmação de e-mail ligada no projeto, o cadastro não abre sessão.
  if (!data.session) {
    return {
      aviso: `Enviamos um link de confirmação para ${validado.data.email}. Abra-o para entrar.`,
    };
  }

  revalidatePath("/", "layout");
  redirect(ROTA_APOS_LOGIN);
}

export async function sair(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect(ROTA_LOGIN);
}
