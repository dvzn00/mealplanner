# Banco do Meal Planner

## Como aplicar

**Pelo SQL Editor** — o caminho mais curto para um projeto que já existe:

```bash
npm run --silent db:sql > schema.sql
```

Cole o conteúdo no SQL Editor do projeto e execute. A ordem dos arquivos
importa e o script já a respeita.

**Pela CLI** — se você usa `supabase link`:

```bash
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```

## Os arquivos, em ordem

| Arquivo                       | O que faz                                              |
| ----------------------------- | ------------------------------------------------------ |
| `..._schema.sql`              | tabelas, índices, checks e `updated_at`                |
| `..._shopping_list.sql`       | `generate_shopping_list` e os gatilhos que a disparam  |
| `..._rls.sql`                 | privilégios de tabela e políticas de RLS               |
| `..._auth_hooks.sql`          | cria `profiles` quando alguém se cadastra              |
| `..._storage.sql`             | bucket `recipe-images` e suas políticas                |

## Como isso é testado

`supabase/tests/` sobe um Postgres de verdade em WASM (PGlite), aplica as
mesmas migrações e exercita a função, os gatilhos e as políticas:

```bash
npm run test
```

O schema `auth` e os papéis `anon` / `authenticated` / `service_role` são
recriados em versão mínima no `db.ts` — inclusive `auth.uid()`, que lê a mesma
variável de sessão que o PostgREST preenche a partir do JWT. As políticas
rodam sem adaptação nenhuma.

A migração de storage fica de fora: ela depende do schema `storage`, que só
existe em um projeto Supabase.

## Duas decisões que valem lembrar

**A lista de compras agrupa por (ingrediente, unidade).** 300 g de farinha em
uma receita e 0,5 kg em outra viram duas linhas. Somar exigiria uma tabela de
conversão que ainda não existe, e converter errado é pior do que listar
separado.

**`comprado` sobrevive ao recálculo.** Acrescentar uma receita ao plano muda a
quantidade do item, não desmarca o que já foi ao carrinho.
