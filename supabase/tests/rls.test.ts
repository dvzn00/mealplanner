// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { comoAnonimo, comoUsuario, criarBancoDeTeste } from "./db";
import {
  criarIngrediente,
  criarPlano,
  criarReceita,
  criarSlot,
  criarUsuario,
} from "./fixtures";

let db: PGlite;
let ana: string;
let bruno: string;
let planoDaAna: string;
let receitaDaAna: string;
let receitaGlobal: string;

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
      public.weekly_plans, public.recipe_favorites, public.recipe_ingredients,
      public.recipes, public.ingredients, public.profiles, auth.users
    cascade;
  `);

  ana = await criarUsuario(db, "ana@exemplo.com", "Ana");
  bruno = await criarUsuario(db, "bruno@exemplo.com", "Bruno");

  const tomate = await criarIngrediente(db, "Tomate", "g");
  receitaGlobal = await criarReceita(db, "Molho da casa", [
    { ingredientId: tomate, quantidade: 400, unidade: "g" },
  ]);
  receitaDaAna = await criarReceita(
    db,
    "Molho secreto da Ana",
    [{ ingredientId: tomate, quantidade: 500, unidade: "g" }],
    ana,
  );

  planoDaAna = await criarPlano(db, ana);
  await criarSlot(db, {
    planId: planoDaAna,
    dia: "segunda",
    recipeId: receitaGlobal,
  });
});

describe("RLS: planos e slots", () => {
  // O cadastro monta uma semana de exemplo para cada usuário, então as
  // contagens abaixo apontam o plano da Ana em vez de contar a tabela toda.

  it("a dona enxerga o próprio plano", async () => {
    const total = await comoUsuario(db, ana, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.weekly_plans where id = $1",
        [planoDaAna],
      );
      return rows[0].c;
    });

    expect(total).toBe(1);
  });

  it("outro usuário não enxerga plano alheio", async () => {
    const total = await comoUsuario(db, bruno, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.weekly_plans where id = $1",
        [planoDaAna],
      );
      return rows[0].c;
    });

    expect(total).toBe(0);
  });

  it("outro usuário não enxerga os slots do plano alheio", async () => {
    const total = await comoUsuario(db, bruno, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.plan_slots where plan_id = $1",
        [planoDaAna],
      );
      return rows[0].c;
    });

    expect(total).toBe(0);
  });

  it("outro usuário não enxerga a lista de compras alheia", async () => {
    const total = await comoUsuario(db, bruno, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.shopping_list where plan_id = $1",
        [planoDaAna],
      );
      return rows[0].c;
    });

    expect(total).toBe(0);
  });

  it("não dá para criar plano em nome de outra pessoa", async () => {
    await expect(
      comoUsuario(db, bruno, (tx) =>
        tx.query(
          `insert into public.weekly_plans (user_id, semana_inicio, semana_fim)
           values ($1, '2026-09-14'::date, '2026-09-20'::date)`,
          [ana],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("não dá para pendurar um slot no plano de outra pessoa", async () => {
    await expect(
      comoUsuario(db, bruno, (tx) =>
        tx.query(
          `insert into public.plan_slots
             (plan_id, dia_da_semana, nome_refeicao, horario, posicao)
           values ($1, 'terca', 'Jantar', '20:00', 0)`,
          [planoDaAna],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("RLS: receitas", () => {
  it("a receita global aparece para qualquer usuário", async () => {
    const nomes = await comoUsuario(db, bruno, async (tx) => {
      const { rows } = await tx.query<{ nome: string }>(
        "select nome from public.recipes order by nome",
      );
      return rows.map((r) => r.nome);
    });

    expect(nomes).toEqual(["Molho da casa"]);
  });

  it("a dona vê a global e a própria", async () => {
    const nomes = await comoUsuario(db, ana, async (tx) => {
      const { rows } = await tx.query<{ nome: string }>(
        "select nome from public.recipes order by nome",
      );
      return rows.map((r) => r.nome);
    });

    expect(nomes).toEqual(["Molho da casa", "Molho secreto da Ana"]);
  });

  it("apagar receita alheia não afeta nenhuma linha", async () => {
    await comoUsuario(db, bruno, (tx) =>
      tx.query("delete from public.recipes where id = $1", [receitaDaAna]),
    );

    const { rows } = await db.query<{ c: number }>(
      "select count(*)::int as c from public.recipes where id = $1",
      [receitaDaAna],
    );
    expect(rows[0].c).toBe(1);
  });

  it("ninguém edita as receitas globais pela API", async () => {
    await comoUsuario(db, ana, (tx) =>
      tx.query("update public.recipes set nome = 'Sequestrada' where id = $1", [
        receitaGlobal,
      ]),
    );

    const { rows } = await db.query<{ nome: string }>(
      "select nome from public.recipes where id = $1",
      [receitaGlobal],
    );
    expect(rows[0].nome).toBe("Molho da casa");
  });

  it("os ingredientes de receita alheia ficam fora do alcance", async () => {
    const total = await comoUsuario(db, bruno, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        `select count(*)::int as c from public.recipe_ingredients
         where recipe_id = $1`,
        [receitaDaAna],
      );
      return rows[0].c;
    });

    expect(total).toBe(0);
  });
});

describe("RLS: favoritas", () => {
  // Favorita é vínculo entre uma pessoa e uma receita, e não um atributo da
  // receita — a global é a mesma linha para todo mundo. Estes testes são o que
  // garante que ninguém veja nem escreva a estrela de outra pessoa.
  it("a favorita de uma não aparece para a outra", async () => {
    await comoUsuario(db, ana, (tx) =>
      tx.query(
        "insert into public.recipe_favorites (user_id, recipe_id) values ($1, $2)",
        [ana, receitaGlobal],
      ),
    );

    const doBruno = await comoUsuario(db, bruno, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.recipe_favorites",
      );
      return rows[0].c;
    });

    const daAna = await comoUsuario(db, ana, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.recipe_favorites",
      );
      return rows[0].c;
    });

    expect(doBruno).toBe(0);
    expect(daAna).toBe(1);
  });

  it("não dá para favoritar em nome de outra pessoa", async () => {
    await expect(
      comoUsuario(db, bruno, (tx) =>
        tx.query(
          "insert into public.recipe_favorites (user_id, recipe_id) values ($1, $2)",
          [ana, receitaGlobal],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("desfavoritar a de outra pessoa não afeta nenhuma linha", async () => {
    await db.query(
      "insert into public.recipe_favorites (user_id, recipe_id) values ($1, $2)",
      [ana, receitaGlobal],
    );

    await comoUsuario(db, bruno, (tx) =>
      tx.query("delete from public.recipe_favorites where recipe_id = $1", [
        receitaGlobal,
      ]),
    );

    const { rows } = await db.query<{ c: number }>(
      "select count(*)::int as c from public.recipe_favorites where user_id = $1",
      [ana],
    );
    expect(rows[0].c).toBe(1);
  });

  it("favoritar duas vezes é o mesmo que favoritar uma", async () => {
    // A chave primária é o par. É ela que deixa o cliente usar um insert
    // idempotente em vez de ler antes de gravar — dois toques rápidos no
    // mesmo botão não podem virar erro.
    await expect(
      db.query(
        `insert into public.recipe_favorites (user_id, recipe_id)
         values ($1, $2), ($1, $2)`,
        [ana, receitaGlobal],
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it("apagar a receita leva a favorita junto", async () => {
    await db.query(
      "insert into public.recipe_favorites (user_id, recipe_id) values ($1, $2)",
      [ana, receitaDaAna],
    );

    await db.query("delete from public.recipes where id = $1", [receitaDaAna]);

    const { rows } = await db.query<{ c: number }>(
      "select count(*)::int as c from public.recipe_favorites",
    );
    expect(rows[0].c).toBe(0);
  });
});

describe("RLS: lista de compras", () => {
  it("a dona marca um item como comprado", async () => {
    await comoUsuario(db, ana, (tx) =>
      tx.query("update public.shopping_list set comprado = true"),
    );

    const { rows } = await db.query<{ comprado: boolean }>(
      "select comprado from public.shopping_list where plan_id = $1",
      [planoDaAna],
    );
    expect(rows[0].comprado).toBe(true);
  });

  it("nem a dona altera a quantidade calculada", async () => {
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query("update public.shopping_list set quantidade_total = 1"),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("ninguém insere item na lista pela API", async () => {
    await expect(
      comoUsuario(db, ana, (tx) =>
        tx.query(
          `insert into public.shopping_list
             (user_id, plan_id, ingredient_id, quantidade_total, unidade)
           select $1, $2, id, 1, 'g' from public.ingredients limit 1`,
          [ana, planoDaAna],
        ),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe("RLS: visitante não autenticado", () => {
  it("lê o catálogo de ingredientes", async () => {
    const total = await comoAnonimo(db, async (tx) => {
      const { rows } = await tx.query<{ c: number }>(
        "select count(*)::int as c from public.ingredients",
      );
      return rows[0].c;
    });

    expect(total).toBe(1);
  });

  it("não alcança as receitas", async () => {
    await expect(
      comoAnonimo(db, (tx) => tx.query("select * from public.recipes")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("não alcança os planos", async () => {
    await expect(
      comoAnonimo(db, (tx) => tx.query("select * from public.weekly_plans")),
    ).rejects.toThrow(/permission denied/i);
  });
});
