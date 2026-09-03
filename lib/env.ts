import { z } from "zod";

/**
 * Variáveis de ambiente públicas — as que o Next injeta no bundle do browser.
 *
 * A validação é preguiçosa de propósito: acontece quando alguém pede as
 * variáveis, não na importação do módulo. Assim `next build` roda em um clone
 * recém-clonado sem `.env.local`, e quem esquecer de preencher recebe a falha
 * na primeira requisição, com o nome da variável que falta.
 *
 * As mensagens de erro citam só o nome da variável. Valor de chave não vai
 * para log, nem quando o log é uma exceção.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "não foi preenchida")
    .url("precisa ser a URL do projeto, algo como https://xxxx.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "não foi preenchida"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cache: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  if (cache) {
    return cache;
  }

  // Referência literal a cada chave: é o que permite o Next substituir o
  // valor no bundle do cliente em tempo de build.
  const resultado = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!resultado.success) {
    throw new Error(descreverFalhas(resultado.error));
  }

  cache = resultado.data;
  return cache;
}

export function descreverFalhas(erro: z.ZodError): string {
  const detalhes = erro.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  return `Configuração do Supabase incompleta.\n${detalhes}\n\nCopie .env.example para .env.local e preencha as chaves do projeto.`;
}
