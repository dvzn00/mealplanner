import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase do servidor — Server Components, Server Actions e Route
 * Handlers. Fala com o banco pela chave anônima, então a RLS continua valendo:
 * a identidade vem do cookie de sessão do usuário.
 */
export async function createClient() {
  const env = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component não pode escrever cookie. Tudo bem: o proxy
            // já renovou a sessão antes da requisição chegar aqui.
          }
        },
      },
    },
  );
}

/**
 * O usuário da requisição, ou `null`. Sempre `getUser()` — ele valida o token
 * no servidor de auth. `getSession()` confia no cookie, que o cliente controla.
 */
export async function getUsuarioAtual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
