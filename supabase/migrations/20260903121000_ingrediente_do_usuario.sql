-- Meal Planner — deixar o usuário estender o catálogo de ingredientes
--
-- `ingredients` é catálogo compartilhado: a lista de compras soma por
-- `ingredient_id`, então "Azeite de oliva" precisa ser a mesma linha para
-- todo mundo. Por isso a tabela nunca aceitou escrita pela API.
--
-- Só que uma receita própria sem ingrediente novo não serve para nada: o
-- catálogo tem dezenove itens, e ninguém cozinha com dezenove ingredientes.
--
-- A saída é uma porta estreita em vez de abrir a tabela. Esta função recebe
-- nome e unidade, devolve o id do ingrediente que já existir e cria só quando
-- não existe. O usuário não escolhe id, não altera nome alheio, não apaga
-- nada — e a corrida entre duas pessoas cadastrando "Farinha de trigo" ao
-- mesmo tempo termina nas duas com o mesmo id.

create or replace function public.obter_ou_criar_ingrediente(
  p_nome text,
  p_unidade text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nome    text := btrim(coalesce(p_nome, ''));
  v_unidade text := btrim(coalesce(p_unidade, ''));
  v_id      uuid;
begin
  if length(v_nome) = 0 or length(v_unidade) = 0 then
    raise exception 'ingrediente precisa de nome e unidade';
  end if;

  -- O índice único é sobre lower(nome); a busca acompanha.
  select i.id into v_id
  from public.ingredients i
  where lower(i.nome) = lower(v_nome);

  if v_id is not null then
    return v_id;
  end if;

  insert into public.ingredients (nome, unidade_padrao)
  values (v_nome, v_unidade)
  on conflict do nothing
  returning id into v_id;

  -- Alguém cadastrou o mesmo nome entre a busca e a inserção.
  if v_id is null then
    select i.id into v_id
    from public.ingredients i
    where lower(i.nome) = lower(v_nome);
  end if;

  return v_id;
end;
$$;

comment on function public.obter_ou_criar_ingrediente(text, text) is
  'Devolve o id do ingrediente pelo nome, criando-o se ainda não existir.';

revoke all on function public.obter_ou_criar_ingrediente(text, text) from public;
grant execute on function public.obter_ou_criar_ingrediente(text, text)
  to authenticated, service_role;
