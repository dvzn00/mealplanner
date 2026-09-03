-- Meal Planner — a semana que o usuário encontra ao entrar pela primeira vez
--
-- Três refeições por dia, sete dias, e os dois primeiros dias já preenchidos
-- com receitas do catálogo global. O resto fica vazio de propósito: é o convite
-- para arrastar.
--
-- A escolha das receitas é determinística, não aleatória. Ordena o catálogo
-- global por calorias e distribui em ordem cronológica, começando pelo café da
-- manhã de segunda — então a receita mais leve cai no café. Determinismo aqui
-- é o que permite o teste afirmar alguma coisa, e o que faz duas contas novas
-- verem a mesma demonstração.

create or replace function public.montar_semana_de_exemplo(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- date_trunc('week') devolve a segunda-feira: a semana ISO começa nela.
  v_segunda date := date_trunc('week', current_date)::date;
  v_plan_id uuid;
begin
  insert into public.weekly_plans (user_id, semana_inicio, semana_fim)
  values (p_user_id, v_segunda, v_segunda + 6)
  on conflict (user_id, semana_inicio) do nothing
  returning id into v_plan_id;

  -- A semana já existia: não mexe no que o usuário montou.
  if v_plan_id is null then
    select wp.id into v_plan_id
    from public.weekly_plans wp
    where wp.user_id = p_user_id and wp.semana_inicio = v_segunda;

    return v_plan_id;
  end if;

  insert into public.plan_slots
    (plan_id, dia_da_semana, nome_refeicao, horario, posicao)
  select v_plan_id, dias.dia, refeicoes.nome, refeicoes.horario, refeicoes.posicao
  from (values
    ('segunda', 1), ('terca', 2), ('quarta', 3), ('quinta', 4),
    ('sexta', 5), ('sabado', 6), ('domingo', 7)
  ) as dias (dia, ordem)
  cross join (values
    ('Café da manhã', '08:00'::time, 0),
    ('Almoço',        '12:00'::time, 1),
    ('Jantar',        '20:00'::time, 2)
  ) as refeicoes (nome, horario, posicao);

  -- Preenche segunda e terça com o catálogo global, ciclando se houver menos
  -- receitas que horários. Com o catálogo padrão de 5 receitas e 6 horários, a
  -- primeira repete — e a lista de compras já mostra a soma funcionando.
  with horarios as (
    select ps.id,
           row_number() over (order by dias.ordem, ps.posicao) - 1 as n
    from public.plan_slots ps
    join (values ('segunda', 1), ('terca', 2)) as dias (dia, ordem)
      on dias.dia = ps.dia_da_semana
    where ps.plan_id = v_plan_id
  ),
  catalogo as (
    select r.id,
           row_number() over (order by r.calorias, r.nome) - 1 as n,
           count(*) over () as total
    from public.recipes r
    where r.user_id is null
  )
  update public.plan_slots ps
  set recipe_id = catalogo.id
  from horarios, catalogo
  where ps.id = horarios.id
    and catalogo.n = horarios.n % catalogo.total;

  -- O gatilho de plan_slots já recalculou a lista. A chamada explícita fica
  -- porque a semana de exemplo não deve depender de o gatilho existir.
  perform public.generate_shopping_list(v_plan_id);

  return v_plan_id;
end;
$$;

comment on function public.montar_semana_de_exemplo(uuid) is
  'Cria a semana atual do usuário com 3 refeições por dia e uma demonstração preenchida.';

-- ---------------------------------------------------------------------------
-- Nenhuma das duas funções deve ser chamável pela API.
--
-- As duas são SECURITY DEFINER e recebem um id como parâmetro, então expostas
-- via RPC deixariam um usuário agir sobre o plano de outro. Quem precisa delas
-- é o gatilho — que roda como dono do schema — e a administração.
-- ---------------------------------------------------------------------------
revoke all on function public.generate_shopping_list(uuid) from public;
revoke all on function public.montar_semana_de_exemplo(uuid) from public;
grant execute on function public.generate_shopping_list(uuid) to service_role;
grant execute on function public.montar_semana_de_exemplo(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- O cadastro passa a montar a semana, além de criar o perfil.
--
-- A montagem vai dentro de um bloco de exceção: se ela falhar, o cadastro
-- precisa seguir em frente. Dado de demonstração não é motivo para impedir
-- alguém de criar conta.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;

  begin
    perform public.montar_semana_de_exemplo(new.id);
  exception
    when others then
      raise warning 'Semana de exemplo falhou para % : %', new.id, sqlerrm;
  end;

  return new;
end;
$$;
