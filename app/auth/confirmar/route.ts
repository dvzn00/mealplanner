import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro } from "@/lib/auth/schemas";
import { ROTA_APOS_LOGIN, ROTA_LOGIN } from "@/lib/supabase/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Onde o link do e-mail de confirmação aterrissa. Troca o token por uma
 * sessão e manda a pessoa para o dashboard; link vencido volta para o login
 * com uma explicação.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = destinoSeguro(
    searchParams.get("next") ?? undefined,
    ROTA_APOS_LOGIN,
  );

  if (tokenHash && tipo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: tipo,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(destino, origin));
    }
  }

  return NextResponse.redirect(
    new URL(`${ROTA_LOGIN}?erro=confirmacao`, origin),
  );
}
