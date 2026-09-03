/**
 * Quais rotas dispensam sessão. Fica separado do proxy para poder ser testado
 * sem subir o Next inteiro.
 */

/** Rota de entrada quando alguém sem sessão pede uma página protegida. */
export const ROTA_LOGIN = "/login";

/** Para onde vai quem já está autenticado e tenta abrir login ou cadastro. */
export const ROTA_APOS_LOGIN = "/dashboard";

/**
 * Prefixos públicos. `/` está aqui enquanto a home é a página de apresentação;
 * o Bloco 4 decide se ela vira landing ou redireciona para o dashboard.
 */
const PREFIXOS_PUBLICOS = [
  "/",
  "/login",
  "/cadastro",
  "/auth", // callback e confirmação de e-mail do Supabase
] as const;

export function ehRotaPublica(pathname: string): boolean {
  return PREFIXOS_PUBLICOS.some(
    (prefixo) =>
      pathname === prefixo ||
      (prefixo !== "/" && pathname.startsWith(`${prefixo}/`)),
  );
}

/** Rotas onde alguém já autenticado não deveria estar. */
export function ehRotaDeEntrada(pathname: string): boolean {
  return pathname === "/login" || pathname === "/cadastro";
}
