import { createClient } from "@/lib/supabase/server";

export interface UsuarioDaSessao {
  id: string;
  nome: string;
  email: string;
}

/**
 * O usuário da requisição, já com o nome do perfil.
 *
 * `getUser()` valida o token no servidor de auth — `getSession()` confiaria no
 * cookie, que o cliente controla. Se o perfil ainda não existir (conta criada
 * antes do gatilho), cai para o começo do e-mail em vez de mostrar vazio.
 */
export async function obterUsuarioDaSessao(): Promise<UsuarioDaSessao | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";

  return {
    id: user.id,
    nome: perfil?.nome?.trim() || email.split("@")[0] || "Você",
    email,
  };
}

/** O primeiro nome, para saudação. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}
