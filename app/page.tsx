import { redirect } from "next/navigation";
import { obterUsuarioDaSessao } from "@/lib/data/sessao";
import { ROTA_APOS_LOGIN, ROTA_LOGIN } from "@/lib/supabase/routes";

/**
 * A raiz não tem tela própria: manda quem já entrou para o dashboard e o
 * resto para o login. Uma página de apresentação pode ocupar este lugar
 * quando o produto tiver o que mostrar para quem ainda não entrou.
 */
export default async function Raiz() {
  const usuario = await obterUsuarioDaSessao();

  redirect(usuario ? ROTA_APOS_LOGIN : ROTA_LOGIN);
}
