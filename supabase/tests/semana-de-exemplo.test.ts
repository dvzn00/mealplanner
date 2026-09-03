// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { comoUsuario, criarBancoDeTeste } from "./db";
import {
  criarIngrediente,
  criarUsuario,
  lerListaDeCompras,
} from "./fixtures";

let db: PGlite;

beforeAll(async () => {
  db = await criarBancoDeTeste();
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec(`
    truncate
      public.plan_copies, public.shopping_list, public.plan_slots,
      public.weekly_plans, public.recipe_ingredients, public.recipes,
      public.ingredients, public.profiles, auth.users
    cascade;
  `);
});

/** Três receitas globais com calorias distintas e um ingrediente cada. */
async function semearCatalogo() {
  const arroz = await criarIngrediente(db, "Arroz", "g");
  const feijao = await criarIngrediente(db, "Feijão", "g");
  const ovo = await criarIngrediente(db, "Ovo", "unidades");

  await criarReceitaComCalorias("Leve", 100, arroz, 10, "g");
  await criarReceitaComCalorias("Média", 200, feijao, 20, "g");
  await criarReceitaComCalorias("Forte", 300, ovo, 1, "unidades");
}

async function criarReceitaComCalorias(
  nome: string,
  calorias: number,
  ingredientId: string,
  quantidade: number,
  unidade: string,
) {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.recipes
       (user_id, nome, modo_preparo, calorias, tempo_preparo, porcoes)
     values (null, $1, 'Misture tudo.', $2, 15, 2)
     returning id`,
    [nome, calorias],
  );
  await db.query(
    `insert into public.recipe_ingredients
       (recipe_id, ingredient_id, quantidade, unidade)
     values ($1, $2, $3, $4)`,
    [rows[0].id, ingredientId, quantidade, unidade],
  );
}

async function segundaDaSemanaAtual(): Promise<string> {
  const { rows } = await db.query<{ d: string }>(
    "select date_trunc('week', current_date)::date::text as d",
  );
  return rows[0].d;
}

describe("semana de exemplo no cadastro", () => {
  it("cria a semana atual, de segunda a domingo", async () => {
    const userId = await criarUsuario(db, "novo@exemplo.com", "Novo");
    const segunda = await segundaDaSemanaAtual();

    const { rows } = await db.query<{
      semana_inicio: string;
      semana_fim: string;
    }>(
      `select semana_inicio::text, semana_fim::text
       from public.weekly_plans where user_id = $1`,
      [userId],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].semana_inicio).toBe(segunda);
    expect(new Date(rows[0].semana_fim).getTime()).toBe(
      new Date(segunda).getTime() + 6 * 86400000,
    );
  });

  it("monta três refeições por dia, nos sete dias", async () => {
    const userId = await criarUsuario(db, "novo@exemplo.com");

    const { rows } = await db.query<{ c: number }>(
      `select count(*)::int as c
       from public.plan_slots ps
       join public.weekly_plans wp on wp.id = ps.plan_id
       where wp.user_id = $1`,
      [userId],
    );

    expect(rows[0].c).toBe(21);
  });

  it("usa os horários padrão de café, almoço e jantar", async () => {
    const userId = await criarUsuario(db, "novo@exemplo.com");

    const { rows } = await db.query<{
      nome_refeicao: string;
      horario: string;
      posicao: number;
    }>(
      `select distinct ps.nome_refeicao, ps.horario::text, ps.posicao
       from public.plan_slots ps
       join public.weekly_plans wp on wp.id = ps.plan_id
       where wp.user_id = $1
       order by ps.posicao`,
      [userId],
    );

    expect(rows).toEqual([
      { nome_refeicao: "Café da manhã", horario: "08:00:00", posicao: 0 },
      { nome_refeicao: "Almoço", horario: "12:00:00", posicao: 1 },
      { nome_refeicao: "Jantar", horario: "20:00:00", posicao: 2 },
    ]);
  });

  it("preenche segunda e terça e deixa o resto da semana livre", async () => {
    await semearCatalogo();
    const userId = await criarUsuario(db, "novo@exemplo.com");

    const { rows } = await db.query<{ dia_da_semana: string; c: number }>(
      `select ps.dia_da_semana, count(*)::int as c
       from public.plan_slots ps
       join public.weekly_plans wp on wp.id = ps.plan_id
       where wp.user_id = $1 and ps.recipe_id is not null
       group by ps.dia_da_semana
       order by ps.dia_da_semana`,
      [userId],
    );

    expect(rows).toEqual([
      { dia_da_semana: "segunda", c: 3 },
      { dia_da_semana: "terca", c: 3 },
    ]);
  });

  it("põe a receita mais leve no café da manhã de segunda", async () => {
    await semearCatalogo();
    const userId = await criarUsuario(db, "novo@exemplo.com");

    const { rows } = await db.query<{ nome: string }>(
      `select r.nome
       from public.plan_slots ps
       join public.weekly_plans wp on wp.id = ps.plan_id
       join public.recipes r on r.id = ps.recipe_id
       where wp.user_id = $1
         and ps.dia_da_semana = 'segunda'
         and ps.posicao = 0`,
      [userId],
    );

    expect(rows[0].nome).toBe("Leve");
  });

  it("cicla o catálogo quando há menos receitas que horários", async () => {
    await semearCatalogo();
    const userId = await criarUsuario(db, "novo@exemplo.com");

    const { rows } = await db.query<{ nome: string; c: number }>(
      `select r.nome, count(*)::int as c
       from public.plan_slots ps
       join public.weekly_plans wp on wp.id = ps.plan_id
       join public.recipes r on r.id = ps.recipe_id
       where wp.user_id = $1
       group by r.nome
       order by r.nome`,
      [userId],
    );

    // 3 receitas em 6 horários: cada uma entra duas vezes.
    expect(rows).toEqual([
      { nome: "Forte", c: 2 },
      { nome: "Leve", c: 2 },
      { nome: "Média", c: 2 },
    ]);
  });

  it("entrega a lista de compras já somada", async () => {
    await semearCatalogo();
    const userId = await criarUsuario(db, "novo@exemplo.com");

    const { rows } = await db.query<{ id: string }>(
      "select id from public.weekly_plans where user_id = $1",
      [userId],
    );
    const lista = await lerListaDeCompras(db, rows[0].id);

    expect(
      lista.map((i) => [i.nome, Number(i.quantidade_total), i.unidade]),
    ).toEqual([
      ["Arroz", 20, "g"],
      ["Feijão", 40, "g"],
      ["Ovo", 2, "unidades"],
    ]);
  });

  it("cadastra bem mesmo sem catálogo global", async () => {
    const userId = await criarUsuario(db, "pioneiro@exemplo.com");

    const { rows } = await db.query<{ slots: number; itens: number }>(
      `select
         (select count(*)::int from public.plan_slots ps
          join public.weekly_plans wp on wp.id = ps.plan_id
          where wp.user_id = $1) as slots,
         (select count(*)::int from public.shopping_list
          where user_id = $1) as itens`,
      [userId],
    );

    expect(rows[0]).toEqual({ slots: 21, itens: 0 });
  });

  it("chamada de novo, não duplica nem sobrescreve a semana", async () => {
    await semearCatalogo();
    const userId = await criarUsuario(db, "novo@exemplo.com");

    // Simula o usuário tendo esvaziado um horário antes da segunda chamada.
    await db.query(
      `update public.plan_slots ps
       set recipe_id = null
       from public.weekly_plans wp
       where wp.id = ps.plan_id and wp.user_id = $1
         and ps.dia_da_semana = 'segunda' and ps.posicao = 0`,
      [userId],
    );

    await db.query("select public.montar_semana_de_exemplo($1)", [userId]);

    const { rows } = await db.query<{ planos: number; preenchidos: number }>(
      `select
         (select count(*)::int from public.weekly_plans where user_id = $1) as planos,
         (select count(*)::int from public.plan_slots ps
          join public.weekly_plans wp on wp.id = ps.plan_id
          where wp.user_id = $1 and ps.recipe_id is not null) as preenchidos`,
      [userId],
    );

    expect(rows[0]).toEqual({ planos: 1, preenchidos: 5 });
  });
});

describe("as funções não são chamáveis pela API", () => {
  it("authenticated não chama montar_semana_de_exemplo", async () => {
    const userId = await criarUsuario(db, "curioso@exemplo.com");

    await expect(
      comoUsuario(db, userId, (tx) =>
        tx.query("select public.montar_semana_de_exemplo($1)", [userId]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("authenticated não chama generate_shopping_list", async () => {
    const userId = await criarUsuario(db, "curioso@exemplo.com");
    const { rows } = await db.query<{ id: string }>(
      "select id from public.weekly_plans where user_id = $1",
      [userId],
    );

    await expect(
      comoUsuario(db, userId, (tx) =>
        tx.query("select public.generate_shopping_list($1)", [rows[0].id]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});
