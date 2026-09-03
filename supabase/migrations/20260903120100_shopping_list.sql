-- Meal Planner — lista de compras derivada do plano
--
-- A lista nunca é escrita à mão: ela é recalculada a partir dos slots do plano.
-- O usuário só encosta na coluna `comprado` (ver as políticas de RLS).
--
-- Regra de agrupamento: soma por (ingrediente, unidade). Se uma receita pede
-- 300 g de farinha e outra pede 0,5 kg, a lista mostra duas linhas. Somar as
-- duas exigiria uma tabela de conversão que ainda não existe, e converter
-- errado é pior do que listar separado.

create or replace function public.generate_shopping_list(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
begin
  select wp.user_id into v_user_id
  from public.weekly_plans wp
  where wp.id = p_plan_id;

  -- Plano inexistente (ou já removido em cascata): nada a recalcular.
  if v_user_id is null then
    return;
  end if;

  -- Insere o que falta, atualiza o que mudou. `comprado` é preservado de
  -- propósito: mudar a quantidade não desmarca o que já foi ao carrinho.
  insert into public.shopping_list as sl
    (user_id, plan_id, ingredient_id, quantidade_total, unidade)
  select
    v_user_id,
    p_plan_id,
    ri.ingredient_id,
    sum(ri.quantidade),
    ri.unidade
  from public.plan_slots ps
  join public.recipe_ingredients ri on ri.recipe_id = ps.recipe_id
  where ps.plan_id = p_plan_id
  group by ri.ingredient_id, ri.unidade
  on conflict (plan_id, ingredient_id, unidade) do update
    set quantidade_total = excluded.quantidade_total,
        updated_at       = now()
    where sl.quantidade_total is distinct from excluded.quantidade_total;

  -- Some da lista o que saiu do plano.
  delete from public.shopping_list sl
  where sl.plan_id = p_plan_id
    and not exists (
      select 1
      from public.plan_slots ps
      join public.recipe_ingredients ri on ri.recipe_id = ps.recipe_id
      where ps.plan_id = p_plan_id
        and ri.ingredient_id = sl.ingredient_id
        and ri.unidade = sl.unidade
    );
end;
$$;

comment on function public.generate_shopping_list(uuid) is
  'Recalcula shopping_list para um plano, somando ingredientes por unidade.';

-- ---------------------------------------------------------------------------
-- Trigger: qualquer mexida em plan_slots refaz a lista daquele plano.
--
-- É um gatilho por linha, e não por comando com transition tables. Uma semana
-- tem algumas dezenas de slots, então recalcular por linha custa pouco e o
-- código fica legível. Se um dia houver escrita em lote grande, a evolução é
-- trocar por três gatilhos `for each statement` com REFERENCING.
-- ---------------------------------------------------------------------------
create or replace function public.plan_slots_refresh_shopping_list()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.generate_shopping_list(old.plan_id);
    return old;
  end if;

  -- Slot movido de plano: os dois lados precisam ser recalculados.
  if tg_op = 'UPDATE' and old.plan_id is distinct from new.plan_id then
    perform public.generate_shopping_list(old.plan_id);
  end if;

  perform public.generate_shopping_list(new.plan_id);
  return new;
end;
$$;

drop trigger if exists plan_slots_refresh_shopping_list on public.plan_slots;
create trigger plan_slots_refresh_shopping_list
  after insert or update or delete on public.plan_slots
  for each row execute function public.plan_slots_refresh_shopping_list();

-- Trocar os ingredientes de uma receita muda a lista de todo plano que a usa.
create or replace function public.recipe_ingredients_refresh_shopping_lists()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recipe_id uuid := coalesce(new.recipe_id, old.recipe_id);
  v_plan_id   uuid;
begin
  for v_plan_id in
    select distinct ps.plan_id
    from public.plan_slots ps
    where ps.recipe_id = v_recipe_id
  loop
    perform public.generate_shopping_list(v_plan_id);
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists recipe_ingredients_refresh_shopping_lists
  on public.recipe_ingredients;
create trigger recipe_ingredients_refresh_shopping_lists
  after insert or update or delete on public.recipe_ingredients
  for each row execute function public.recipe_ingredients_refresh_shopping_lists();
