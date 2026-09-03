import { z } from "zod";
import { descreverFalhas } from "./env";

/**
 * A chave de service_role. Ela ignora RLS por completo — quem a tem, lê e
 * escreve qualquer linha de qualquer usuário.
 *
 * Este módulo é importável por scripts de linha de comando (seed, manutenção),
 * por isso não usa `server-only`. A barreira contra o bundle do cliente está em
 * `lib/supabase/admin.ts`, que é por onde a aplicação a consome.
 */

const adminEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "não foi preenchida"),
});

export function getServiceRoleKey(): string {
  const resultado = adminEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!resultado.success) {
    throw new Error(descreverFalhas(resultado.error));
  }

  return resultado.data.SUPABASE_SERVICE_ROLE_KEY;
}
