-- Meal Planner — receitas favoritas
--
-- Por que uma tabela, e não uma coluna `favorita` em `recipes`:
-- `recipes.user_id` é nulo nas receitas do catálogo, que são as mesmas linhas
-- para todo mundo. Uma coluna ali seria compartilhada — eu favoritaria "Sopa
-- de Legumes" e ela apareceria favoritada na conta de todos os outros. O
-- vínculo é entre uma pessoa e uma receita, então ele mora numa linha própria.
--
-- A chave primária é o par: favoritar duas vezes é o mesmo que favoritar uma.
-- Isso deixa o "desfavoritar" ser um delete simples e o "favoritar" um insert
-- idempotente, sem o cliente precisar saber se já existia.

create table if not exists public.recipe_favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

comment on table public.recipe_favorites is
  'As receitas que a pessoa quer à mão no painel de arraste.';

-- A consulta do painel é sempre "as favoritas deste usuário", nessa ordem.
create index if not exists recipe_favorites_por_usuario
  on public.recipe_favorites (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------
revoke all on public.recipe_favorites from anon, authenticated;

-- Sem `update`: uma favorita não tem o que editar. Ou está lá, ou não está.
grant select, insert, delete on public.recipe_favorites to authenticated;

alter table public.recipe_favorites enable row level security;

-- `(select auth.uid())` para o planejador avaliar uma vez por consulta, e não
-- uma vez por linha — mesma razão do resto do arquivo de RLS.
drop policy if exists "favoritas: leitura das próprias" on public.recipe_favorites;
create policy "favoritas: leitura das próprias"
  on public.recipe_favorites for select to authenticated
  using (user_id = (select auth.uid()));

-- O `with check` no insert é o que impede alguém de favoritar em nome de
-- outra pessoa mandando um user_id qualquer no corpo da requisição.
drop policy if exists "favoritas: favoritar para si" on public.recipe_favorites;
create policy "favoritas: favoritar para si"
  on public.recipe_favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "favoritas: desfavoritar as próprias" on public.recipe_favorites;
create policy "favoritas: desfavoritar as próprias"
  on public.recipe_favorites for delete to authenticated
  using (user_id = (select auth.uid()));
