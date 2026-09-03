import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * No Next 16 o antigo `middleware.ts` chama-se `proxy.ts`. Roda antes de toda
 * requisição de página: renova a sessão do Supabase e redireciona quem não
 * está autenticado.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Tudo, menos o que não tem sessão a renovar:
     * assets do Next, favicon e arquivos de imagem.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
