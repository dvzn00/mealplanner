#!/usr/bin/env node
/**
 * Imprime todas as migrações em ordem, em um bloco só, para colar no SQL
 * Editor do Supabase.
 *
 *   npm run db:sql                    # na tela
 *   npm run db:sql > schema.sql       # em arquivo
 *
 * Quem usa a CLI do Supabase não precisa disto: `supabase db push` aplica os
 * arquivos de supabase/migrations diretamente.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "supabase",
  "migrations",
);

const arquivos = readdirSync(migrationsDir)
  .filter((nome) => nome.endsWith(".sql"))
  .sort();

const partes = arquivos.map((nome) => {
  const conteudo = readFileSync(join(migrationsDir, nome), "utf8").trimEnd();
  return `-- ===========================================================\n-- ${nome}\n-- ===========================================================\n\n${conteudo}`;
});

process.stdout.write(`${partes.join("\n\n")}\n`);
