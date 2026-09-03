-- Meal Planner — estrutura de dados
--
-- Convenções desta base:
--   * nomes de coluna em português, como o restante do produto;
--   * dia_da_semana usa slug sem acento ('terca'), porque o valor vai para
--     chaves de React, parâmetros de URL e comparações — o rótulo com acento
--     é responsabilidade da interface;
--   * todo horário é `time`, sem fuso: 08:00 é 08:00 na cozinha do usuário.

-- ---------------------------------------------------------------------------
-- updated_at coerente sem depender do cliente
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — extensão pública de auth.users
-- O Supabase Auth não aceita colunas novas em auth.users, então o nome do
-- usuário mora aqui. A linha é criada por trigger no cadastro.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- recipes — user_id nulo significa receita global (catálogo do produto)
-- ---------------------------------------------------------------------------
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  nome          text not null check (length(btrim(nome)) > 0),
  descricao     text,
  modo_preparo  text not null check (length(btrim(modo_preparo)) > 0),
  calorias      integer not null check (calorias >= 0),
  tempo_preparo integer not null check (tempo_preparo > 0), -- minutos
  porcoes       integer not null check (porcoes > 0),
  imagem_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);
-- O catálogo global é lido em toda listagem; vale um índice dedicado.
create index if not exists recipes_globais_idx on public.recipes (nome)
  where user_id is null;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ingredients — catálogo global, administrado pelo service_role
-- ---------------------------------------------------------------------------
create table if not exists public.ingredients (
  id             uuid primary key default gen_random_uuid(),
  nome           text unique not null check (length(btrim(nome)) > 0),
  unidade_padrao text not null check (length(btrim(unidade_padrao)) > 0)
);

-- "Sal" e "sal" são o mesmo ingrediente. Sem isto o catálogo duplica sozinho.
create unique index if not exists ingredients_nome_lower_key
  on public.ingredients (lower(nome));

-- ---------------------------------------------------------------------------
-- recipe_ingredients — a unidade da linha pode divergir da unidade padrão
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantidade    numeric not null check (quantidade > 0),
  unidade       text not null check (length(btrim(unidade)) > 0),
  unique (recipe_id, ingredient_id)
);

create index if not exists recipe_ingredients_ingredient_id_idx
  on public.recipe_ingredients (ingredient_id);

-- ---------------------------------------------------------------------------
-- weekly_plans — uma linha por semana do usuário, sempre segunda a domingo
-- ---------------------------------------------------------------------------
create table if not exists public.weekly_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  semana_inicio date not null,
  semana_fim    date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, semana_inicio),
  -- extract(isodow) devolve 1 na segunda-feira.
  constraint weekly_plans_comeca_na_segunda
    check (extract(isodow from semana_inicio) = 1),
  constraint weekly_plans_semana_completa
    check (semana_fim = semana_inicio + 6)
);

create index if not exists weekly_plans_user_id_idx
  on public.weekly_plans (user_id, semana_inicio desc);

drop trigger if exists weekly_plans_set_updated_at on public.weekly_plans;
create trigger weekly_plans_set_updated_at
  before update on public.weekly_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plan_slots — as refeições do plano; recipe_id nulo é um horário ainda vazio
-- ---------------------------------------------------------------------------
create table if not exists public.plan_slots (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.weekly_plans(id) on delete cascade,
  dia_da_semana  text not null check (
    dia_da_semana in ('segunda','terca','quarta','quinta','sexta','sabado','domingo')
  ),
  nome_refeicao  text not null check (length(btrim(nome_refeicao)) > 0),
  horario        time not null,
  recipe_id      uuid references public.recipes(id) on delete set null,
  posicao        integer not null check (posicao >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Ordem cronológica dentro do dia. Adiável para que um reordenamento em
  -- lote (arrastar refeições) possa trocar posições dentro da transação.
  constraint plan_slots_posicao_unica unique (plan_id, dia_da_semana, posicao)
    deferrable initially deferred
);

create index if not exists plan_slots_plan_id_idx
  on public.plan_slots (plan_id, dia_da_semana, posicao);
create index if not exists plan_slots_recipe_id_idx
  on public.plan_slots (recipe_id);

drop trigger if exists plan_slots_set_updated_at on public.plan_slots;
create trigger plan_slots_set_updated_at
  before update on public.plan_slots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- shopping_list — derivada dos slots; escrita só por generate_shopping_list
-- ---------------------------------------------------------------------------
create table if not exists public.shopping_list (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  plan_id          uuid not null references public.weekly_plans(id) on delete cascade,
  ingredient_id    uuid not null references public.ingredients(id) on delete cascade,
  quantidade_total numeric not null check (quantidade_total >= 0),
  unidade          text not null,
  comprado         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (plan_id, ingredient_id, unidade)
);

create index if not exists shopping_list_user_id_idx
  on public.shopping_list (user_id);

drop trigger if exists shopping_list_set_updated_at on public.shopping_list;
create trigger shopping_list_set_updated_at
  before update on public.shopping_list
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- plan_copies — histórico de "copiar dia" e "copiar semana"
-- ---------------------------------------------------------------------------
create table if not exists public.plan_copies (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  plan_origem_id   uuid references public.weekly_plans(id) on delete set null,
  plan_destino_id  uuid not null references public.weekly_plans(id) on delete cascade,
  tipo             text not null check (tipo in ('dia','semana')),
  dia_origem       text check (
    dia_origem in ('segunda','terca','quarta','quinta','sexta','sabado','domingo')
  ),
  created_at       timestamptz not null default now(),
  -- Cópia de um dia precisa dizer qual dia; cópia de semana, não.
  constraint plan_copies_dia_coerente check (
    (tipo = 'dia' and dia_origem is not null)
    or (tipo = 'semana' and dia_origem is null)
  )
);

create index if not exists plan_copies_user_id_idx
  on public.plan_copies (user_id, created_at desc);
