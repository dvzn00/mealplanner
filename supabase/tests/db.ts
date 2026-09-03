import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/**
 * Banco Postgres de verdade (PGlite, em WASM) para exercitar as migrações:
 * a função generate_shopping_list, os gatilhos e as políticas de RLS rodam
 * aqui exatamente como rodarão no Supabase.
 *
 * O que o Supabase fornece pronto — o schema `auth`, os papéis `anon`,
 * `authenticated` e `service_role` — é reconstruído abaixo em versão mínima.
 * `auth.uid()` lê a mesma variável de sessão que o PostgREST preenche a partir
 * do JWT, então as políticas funcionam sem adaptação.
 */

const migrationsDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "migrations",
);

/** `storage` não existe fora do Supabase; essa migração fica de fora. */
const MIGRACOES_IGNORADAS = /_storage\.sql$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUPABASE_STUB = `
  create role anon         nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role  nologin noinherit bypassrls;

  create schema auth;

  create table auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
  );

  -- Mesma leitura que o PostgREST faz do JWT em produção.
  create function auth.uid() returns uuid language sql stable as $fn$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $fn$;

  create function auth.role() returns text language sql stable as $fn$
    select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
  $fn$;

  grant usage on schema auth to anon, authenticated, service_role;
`;

export async function criarBancoDeTeste(): Promise<PGlite> {
  const db = await PGlite.create();

  await db.exec(SUPABASE_STUB);

  for (const arquivo of listarMigracoes()) {
    await db.exec(readFileSync(join(migrationsDir, arquivo), "utf8"));
  }

  return db;
}

export function listarMigracoes(): string[] {
  return readdirSync(migrationsDir)
    .filter((nome) => nome.endsWith(".sql"))
    .filter((nome) => !MIGRACOES_IGNORADAS.test(nome))
    .sort();
}

/**
 * Roda o callback como um usuário autenticado — mesmo papel e mesma claim que
 * o PostgREST usa. É assim que as políticas de RLS passam a valer: fora daqui
 * as consultas correm como dono do schema, que enxerga tudo.
 */
export async function comoUsuario<T>(
  db: PGlite,
  userId: string,
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  if (!UUID.test(userId)) {
    throw new Error(`userId precisa ser um UUID: ${userId}`);
  }

  const resultado = await db.transaction(async (tx) => {
    await tx.exec(`set local request.jwt.claim.sub = '${userId}'`);
    await tx.exec(`set local request.jwt.claim.role = 'authenticated'`);
    await tx.exec("set local role authenticated");
    return callback(tx);
  });

  return resultado as T;
}

/** Mesma ideia, para o visitante não autenticado. */
export async function comoAnonimo<T>(
  db: PGlite,
  callback: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const resultado = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return callback(tx);
  });

  return resultado as T;
}
