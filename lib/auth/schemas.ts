import { z } from "zod";

/**
 * Um schema por formulário, usado nos dois lados: o `zodResolver` do
 * react-hook-form valida enquanto a pessoa digita, e a Server Action valida de
 * novo antes de falar com o Supabase. O cliente é conveniência; o servidor é
 * quem decide.
 */

const email = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail")
  .email("Esse e-mail não parece completo");

export const entrarSchema = z.object({
  email,
  senha: z.string().min(1, "Informe sua senha"),
  /** Rota que a pessoa tentou abrir antes de o proxy pedir o login. */
  proximo: z.string().optional(),
});

export const cadastrarSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Como podemos te chamar?")
    .max(80, "Use no máximo 80 caracteres"),
  email,
  senha: z.string().min(8, "Use pelo menos 8 caracteres"),
});

export const perfilSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Como podemos te chamar?")
    .max(80, "Use no máximo 80 caracteres"),
});

export type EntrarInput = z.infer<typeof entrarSchema>;
export type CadastrarInput = z.infer<typeof cadastrarSchema>;
export type PerfilInput = z.infer<typeof perfilSchema>;

/** O que uma Server Action de formulário devolve quando não redireciona. */
export interface ResultadoDeFormulario {
  erro?: string;
  aviso?: string;
  sucesso?: string;
}

/**
 * Só aceita caminho interno. Sem isto, `?proximo=https://outro.site` viraria
 * um redirecionamento aberto — a página de login do produto empurrando a
 * pessoa para fora dele.
 */
export function destinoSeguro(
  proximo: string | undefined,
  padrao: string,
): string {
  if (!proximo) return padrao;
  if (!proximo.startsWith("/") || proximo.startsWith("//")) return padrao;

  return proximo;
}
