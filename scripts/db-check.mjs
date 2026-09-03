#!/usr/bin/env node
/**
 * Confere o estado do banco: as tabelas existem? a função existe? quanta
 * coisa já foi semeada?
 *
 *   npm run db:check
 *
 * Usa a chave de service_role, então ignora RLS — é um diagnóstico de
 * administração, não algo que roda na aplicação.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !secret) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copie .env.example para .env.local e preencha as chaves do projeto.",
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABELAS = [
  "profiles",
  "recipes",
  "ingredients",
  "recipe_ingredients",
  "weekly_plans",
  "plan_slots",
  "shopping_list",
  "plan_copies",
];

let faltando = 0;

console.log(`projeto: ${new URL(url).host}\n`);

for (const tabela of TABELAS) {
  const { count, error } = await supabase
    .from(tabela)
    .select("*", { count: "exact", head: true });

  if (error) {
    faltando += 1;
    console.log(`  ${tabela.padEnd(20)} ausente — ${error.message}`);
  } else {
    console.log(`  ${tabela.padEnd(20)} ok, ${count ?? 0} linha(s)`);
  }
}

const { error: erroRpc } = await supabase.rpc("generate_shopping_list", {
  p_plan_id: "00000000-0000-0000-0000-000000000000",
});

if (erroRpc) {
  faltando += 1;
  console.log(`\n  generate_shopping_list ausente — ${erroRpc.message}`);
} else {
  console.log("\n  generate_shopping_list ok");
}

if (faltando > 0) {
  console.log(
    `\n${faltando} item(ns) faltando. Aplique as migrações: veja supabase/README.md`,
  );
  process.exit(1);
}

console.log("\nSchema completo.");
