-- Meal Planner — permissões e Row Level Security
--
-- Duas camadas, e as duas importam:
--   1. GRANT decide quais colunas o papel pode sequer tocar;
--   2. POLICY decide quais linhas ele enxerga.
--
-- `auth.uid()` aparece como `(select auth.uid())` de propósito: assim o
-- planejador avalia uma vez por consulta em vez de uma vez por linha.

-- ---------------------------------------------------------------------------
-- Privilégios de tabela
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

revoke all on public.profiles          from anon, authenticated;
revoke all on public.recipes           from anon, authenticated;
revoke all on public.ingredients       from anon, authenticated;
revoke all on public.recipe_ingredients from anon, authenticated;
revoke all on public.weekly_plans      from anon, authenticated;
revoke all on public.plan_slots        from anon, authenticated;
revoke all on public.shopping_list     from anon, authenticated;
revoke all on public.plan_copies       from anon, authenticated;

grant select, update                 on public.profiles           to authenticated;
grant select, insert, update, delete on public.recipes            to authenticated;
grant select                         on public.ingredients        to anon, authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.weekly_plans       to authenticated;
grant select, insert, update, delete on public.plan_slots         to authenticated;
grant select, insert, delete         on public.plan_copies        to authenticated;

-- A lista de compras é derivada. O usuário lê tudo e escreve só o "comprado";
-- quantidade e unidade pertencem a generate_shopping_list.
grant select            on public.shopping_list to authenticated;
grant update (comprado) on public.shopping_list to authenticated;

-- ---------------------------------------------------------------------------
-- RLS ligada em todas as tabelas
-- ---------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.recipes            enable row level security;
alter table public.ingredients        enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.weekly_plans       enable row level security;
alter table public.plan_slots         enable row level security;
alter table public.shopping_list      enable row level security;
alter table public.plan_copies        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: leitura do próprio perfil"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: edição do próprio perfil"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- recipes — user_id nulo é receita global, visível para todo mundo e
-- editável por ninguém (só pelo service_role, que ignora RLS).
-- ---------------------------------------------------------------------------
create policy "recipes: leitura das próprias e das globais"
  on public.recipes for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "recipes: criação em nome próprio"
  on public.recipes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "recipes: edição das próprias"
  on public.recipes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "recipes: remoção das próprias"
  on public.recipes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ingredients — catálogo público de leitura. Escrita só pelo service_role.
-- ---------------------------------------------------------------------------
create policy "ingredients: catálogo é público"
  on public.ingredients for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- recipe_ingredients — acompanha a receita
-- ---------------------------------------------------------------------------
create policy "recipe_ingredients: leitura acompanha a receita"
  on public.recipe_ingredients for select to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.user_id is null or r.user_id = (select auth.uid()))
    )
  );

create policy "recipe_ingredients: escrita só nas receitas próprias"
  on public.recipe_ingredients for all to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- weekly_plans
-- ---------------------------------------------------------------------------
create policy "weekly_plans: leitura dos próprios"
  on public.weekly_plans for select to authenticated
  using (user_id = (select auth.uid()));

create policy "weekly_plans: escrita dos próprios"
  on public.weekly_plans for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- plan_slots — a dona é a semana, não o slot
-- ---------------------------------------------------------------------------
create policy "plan_slots: acesso pelo plano do usuário"
  on public.plan_slots for all to authenticated
  using (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = plan_id and wp.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.weekly_plans wp
      where wp.id = plan_id and wp.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- shopping_list — leitura e marcação de comprado
-- ---------------------------------------------------------------------------
create policy "shopping_list: leitura da própria lista"
  on public.shopping_list for select to authenticated
  using (user_id = (select auth.uid()));

create policy "shopping_list: marcar itens como comprados"
  on public.shopping_list for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- plan_copies — histórico; o destino precisa ser um plano do próprio usuário
-- ---------------------------------------------------------------------------
create policy "plan_copies: leitura do próprio histórico"
  on public.plan_copies for select to authenticated
  using (user_id = (select auth.uid()));

create policy "plan_copies: registro de cópia em plano próprio"
  on public.plan_copies for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_plans wp
      where wp.id = plan_destino_id and wp.user_id = (select auth.uid())
    )
  );

create policy "plan_copies: remoção do próprio histórico"
  on public.plan_copies for delete to authenticated
  using (user_id = (select auth.uid()));
