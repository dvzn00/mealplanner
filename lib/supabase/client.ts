import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase do browser. Só para componentes com `"use client"` que
 * precisam de interatividade — realtime, upload, `onAuthStateChange`.
 *
 * Leitura de dados não passa por aqui: acontece em Server Component.
 */
export function createClient() {
  const env = getPublicEnv();

  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
