import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { ROTA_APOS_LOGIN, ROTA_LOGIN, ehRotaDeEntrada, ehRotaPublica } from "./routes";

/**
 * Renova a sessão a cada requisição e barra quem não está autenticado.
 *
 * O consumidor é `proxy.ts` na raiz — no Next 16 o antigo `middleware.ts`
 * passou a se chamar `proxy.ts`. Este arquivo mantém o nome da convenção do
 * Supabase, que é onde a documentação deles manda procurar.
 */
export async function updateSession(request: NextRequest) {
  const env = lerConfiguracao();

  // Sem Supabase configurado não há sessão para renovar nem dado para
  // proteger. Em desenvolvimento a requisição segue, para o projeto abrir
  // antes das chaves chegarem; em produção, isso é falha de deploy.
  if (!env) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Nada entre createServerClient e getUser: é esta chamada que revalida o
  // token e dispara a gravação dos cookies renovados.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !ehRotaPublica(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTA_LOGIN;
    destino.search = "";
    // Para devolver a pessoa ao lugar que ela pediu, depois do login.
    destino.searchParams.set("proximo", pathname);
    return NextResponse.redirect(destino);
  }

  if (user && ehRotaDeEntrada(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = ROTA_APOS_LOGIN;
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return response;
}

function lerConfiguracao() {
  try {
    return getPublicEnv();
  } catch {
    return null;
  }
}
