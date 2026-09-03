-- Meal Planner — tirar um item da lista sem tirá-lo do plano
--
-- A lista de compras é derivada: `generate_shopping_list` a refaz a cada
-- mudança em `plan_slots` ou em `recipe_ingredients`. Apagar a linha, como
-- primeiro impulso sugere, funcionaria até o próximo arraste — e aí o item
-- voltaria sozinho, sem o usuário entender por quê.
--
-- Por isso "remover da lista" é uma marca na linha, não a remoção dela. Já
-- tenho sal em casa: dispenso o item, e ele continua dispensado na semana
-- inteira, mesmo que a receita que o pede mude de horário três vezes.
--
-- A função não precisa mudar: o `do update` dela só toca em quantidade e
-- carimbo de tempo, então `comprado` e `ignorado` atravessam o recálculo
-- intactos.

alter table public.shopping_list
  add column if not exists ignorado boolean not null default false;

comment on column public.shopping_list.ignorado is
  'Item que o usuário tirou da lista; sobrevive ao recálculo.';

-- O usuário continua sem poder escrever quantidade ou unidade — essas
-- pertencem à função. Ganha só mais uma coluna de decisão pessoal.
grant update (comprado, ignorado) on public.shopping_list to authenticated;
