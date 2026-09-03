import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey } from "@/lib/env.admin";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente administrativo: ignora RLS por completo.
 *
 * O `import "server-only"` acima quebra o build se este arquivo escorregar
 * para um componente de cliente. Use apenas onde não há outro caminho —
 * manutenção do catálogo global de ingredientes e receitas, por exemplo.
 * Qualquer coisa em nome do usuário deve passar por `lib/supabase/server.ts`,
 * onde a RLS continua sendo a fronteira.
 */
export function createAdminClient() {
  const env = getPublicEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    getServiceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
