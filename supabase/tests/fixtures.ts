import type { PGlite } from "@electric-sql/pglite";

/**
 * Atalhos para montar cenários. Rodam como dono do schema, portanto ignoram
 * RLS de propósito — é o papel de um seed de teste.
 */

type DiaDaSemana =
  | "segunda"
  | "terca"
  | "quarta"
  | "quinta"
  | "sexta"
  | "sabado"
  | "domingo";

interface IngredienteDaReceita {
  ingredientId: string;
  quantidade: number;
  unidade: string;
}

interface SlotNovo {
  planId: string;
  dia?: DiaDaSemana;
  nomeRefeicao?: string;
  horario?: string;
  recipeId?: string | null;
  posicao?: number;
}

async function inserirRetornandoId(
  db: PGlite,
  sql: string,
  params: unknown[],
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(sql, params);
  const id = rows[0]?.id;
  if (!id) {
    throw new Error(`insert não devolveu id: ${sql}`);
  }
  return id;
}

export async function criarUsuario(
  db: PGlite,
  email: string,
  nome?: string,
): Promise<string> {
  return inserirRetornandoId(
    db,
    `insert into auth.users (email, raw_user_meta_data)
     values ($1, jsonb_build_object('nome', $2::text))
     returning id`,
    [email, nome ?? null],
  );
}

export async function criarIngrediente(
  db: PGlite,
  nome: string,
  unidadePadrao: string,
): Promise<string> {
  return inserirRetornandoId(
    db,
    `insert into public.ingredients (nome, unidade_padrao)
     values ($1, $2)
     returning id`,
    [nome, unidadePadrao],
  );
}

export async function criarReceita(
  db: PGlite,
  nome: string,
  ingredientes: IngredienteDaReceita[],
  userId: string | null = null,
): Promise<string> {
  const recipeId = await inserirRetornandoId(
    db,
    `insert into public.recipes
       (user_id, nome, modo_preparo, calorias, tempo_preparo, porcoes)
     values ($1, $2, 'Misture tudo.', 300, 20, 2)
     returning id`,
    [userId, nome],
  );

  for (const item of ingredientes) {
    await db.query(
      `insert into public.recipe_ingredients
         (recipe_id, ingredient_id, quantidade, unidade)
       values ($1, $2, $3, $4)`,
      [recipeId, item.ingredientId, item.quantidade, item.unidade],
    );
  }

  return recipeId;
}

export async function criarPlano(
  db: PGlite,
  userId: string,
  segundaFeira = "2026-09-07",
): Promise<string> {
  return inserirRetornandoId(
    db,
    `insert into public.weekly_plans (user_id, semana_inicio, semana_fim)
     values ($1, $2::date, $2::date + 6)
     returning id`,
    [userId, segundaFeira],
  );
}

export async function criarSlot(db: PGlite, slot: SlotNovo): Promise<string> {
  return inserirRetornandoId(
    db,
    `insert into public.plan_slots
       (plan_id, dia_da_semana, nome_refeicao, horario, recipe_id, posicao)
     values ($1, $2, $3, $4::time, $5, $6)
     returning id`,
    [
      slot.planId,
      slot.dia ?? "segunda",
      slot.nomeRefeicao ?? "Almoço",
      slot.horario ?? "12:00",
      slot.recipeId ?? null,
      slot.posicao ?? 0,
    ],
  );
}

export interface ItemDaLista {
  nome: string;
  quantidade_total: string;
  unidade: string;
  comprado: boolean;
  ignorado: boolean;
}

/** A lista de compras de um plano, em ordem estável para comparação. */
export async function lerListaDeCompras(
  db: PGlite,
  planId: string,
): Promise<ItemDaLista[]> {
  const { rows } = await db.query<ItemDaLista>(
    `select i.nome, sl.quantidade_total::text, sl.unidade, sl.comprado, sl.ignorado
     from public.shopping_list sl
     join public.ingredients i on i.id = sl.ingredient_id
     where sl.plan_id = $1
     order by i.nome, sl.unidade`,
    [planId],
  );
  return rows;
}
