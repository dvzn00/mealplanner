// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { criarBancoDeTeste } from "./db";
import {
  criarIngrediente,
  criarPlano,
  criarReceita,
  criarSlot,
  criarUsuario,
  lerListaDeCompras,
} from "./fixtures";

let db: PGlite;
let userId: string;
let planId: string;

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

  userId = await criarUsuario(db, "cozinha@exemplo.com", "Davi");
  planId = await criarPlano(db, userId);
});

describe("generate_shopping_list", () => {
  it("soma o mesmo ingrediente vindo de receitas diferentes", async () => {
    const arroz = await criarIngrediente(db, "Arroz integral", "g");

    const risoto = await criarReceita(db, "Risoto", [
      { ingredientId: arroz, quantidade: 120, unidade: "g" },
    ]);
    const bowl = await criarReceita(db, "Bowl", [
      { ingredientId: arroz, quantidade: 80, unidade: "g" },
    ]);

    await criarSlot(db, { planId, dia: "segunda", recipeId: risoto });
    await criarSlot(db, { planId, dia: "terca", recipeId: bowl });

    const lista = await lerListaDeCompras(db, planId);

    expect(lista).toHaveLength(1);
    expect(Number(lista[0].quantidade_total)).toBe(200);
    expect(lista[0].unidade).toBe("g");
  });

  it("conta duas vezes a receita que aparece em dois horários", async () => {
    const ovo = await criarIngrediente(db, "Ovo", "unidades");
    const omelete = await criarReceita(db, "Omelete", [
      { ingredientId: ovo, quantidade: 2, unidade: "unidades" },
    ]);

    await criarSlot(db, { planId, dia: "segunda", recipeId: omelete });
    await criarSlot(db, { planId, dia: "quarta", recipeId: omelete });

    const lista = await lerListaDeCompras(db, planId);

    expect(Number(lista[0].quantidade_total)).toBe(4);
  });

  it("mantém unidades diferentes em linhas separadas", async () => {
    const farinha = await criarIngrediente(db, "Farinha de trigo", "g");

    const pao = await criarReceita(db, "Pão", [
      { ingredientId: farinha, quantidade: 300, unidade: "g" },
    ]);
    const bolo = await criarReceita(db, "Bolo", [
      { ingredientId: farinha, quantidade: 0.5, unidade: "kg" },
    ]);

    await criarSlot(db, { planId, dia: "segunda", recipeId: pao });
    await criarSlot(db, { planId, dia: "terca", recipeId: bolo });

    const lista = await lerListaDeCompras(db, planId);

    expect(lista).toHaveLength(2);
    expect(lista.map((i) => [i.unidade, Number(i.quantidade_total)])).toEqual([
      ["g", 300],
      ["kg", 0.5],
    ]);
  });

  it("remove o ingrediente quando a receita sai do plano", async () => {
    const brocolis = await criarIngrediente(db, "Brócolis", "g");
    const frango = await criarIngrediente(db, "Frango", "g");

    const prato = await criarReceita(db, "Frango com brócolis", [
      { ingredientId: brocolis, quantidade: 150, unidade: "g" },
      { ingredientId: frango, quantidade: 200, unidade: "g" },
    ]);
    const salada = await criarReceita(db, "Salada", [
      { ingredientId: brocolis, quantidade: 50, unidade: "g" },
    ]);

    const slotDoPrato = await criarSlot(db, {
      planId,
      dia: "segunda",
      recipeId: prato,
    });
    await criarSlot(db, { planId, dia: "terca", recipeId: salada });

    expect(await lerListaDeCompras(db, planId)).toHaveLength(2);

    await db.query("delete from public.plan_slots where id = $1", [
      slotDoPrato,
    ]);

    const lista = await lerListaDeCompras(db, planId);
    expect(lista.map((i) => i.nome)).toEqual(["Brócolis"]);
    expect(Number(lista[0].quantidade_total)).toBe(50);
  });

  it("esvazia a lista quando o slot perde a receita", async () => {
    const leite = await criarIngrediente(db, "Leite", "ml");
    const vitamina = await criarReceita(db, "Vitamina", [
      { ingredientId: leite, quantidade: 200, unidade: "ml" },
    ]);

    const slot = await criarSlot(db, {
      planId,
      dia: "segunda",
      recipeId: vitamina,
    });
    expect(await lerListaDeCompras(db, planId)).toHaveLength(1);

    await db.query(
      "update public.plan_slots set recipe_id = null where id = $1",
      [slot],
    );

    expect(await lerListaDeCompras(db, planId)).toEqual([]);
  });

  it("preserva o que já foi marcado como comprado ao recalcular", async () => {
    const azeite = await criarIngrediente(db, "Azeite", "ml");
    const primeira = await criarReceita(db, "Primeira", [
      { ingredientId: azeite, quantidade: 30, unidade: "ml" },
    ]);
    const segunda = await criarReceita(db, "Segunda", [
      { ingredientId: azeite, quantidade: 15, unidade: "ml" },
    ]);

    await criarSlot(db, { planId, dia: "segunda", recipeId: primeira });
    await db.query(
      "update public.shopping_list set comprado = true where plan_id = $1",
      [planId],
    );

    await criarSlot(db, { planId, dia: "terca", recipeId: segunda });

    const lista = await lerListaDeCompras(db, planId);
    expect(Number(lista[0].quantidade_total)).toBe(45);
    expect(lista[0].comprado).toBe(true);
  });

  it("acompanha a edição dos ingredientes de uma receita já planejada", async () => {
    const cenoura = await criarIngrediente(db, "Cenoura", "g");
    const sopa = await criarReceita(db, "Sopa", [
      { ingredientId: cenoura, quantidade: 100, unidade: "g" },
    ]);

    await criarSlot(db, { planId, dia: "segunda", recipeId: sopa });

    await db.query(
      `update public.recipe_ingredients set quantidade = 250
       where recipe_id = $1 and ingredient_id = $2`,
      [sopa, cenoura],
    );

    const lista = await lerListaDeCompras(db, planId);
    expect(Number(lista[0].quantidade_total)).toBe(250);
  });

  it("não mistura a lista de dois planos do mesmo usuário", async () => {
    const cafe = await criarIngrediente(db, "Café", "g");
    const receita = await criarReceita(db, "Café coado", [
      { ingredientId: cafe, quantidade: 20, unidade: "g" },
    ]);

    const outroPlano = await criarPlano(db, userId, "2026-09-14");

    await criarSlot(db, { planId, dia: "segunda", recipeId: receita });
    await criarSlot(db, { planId: outroPlano, dia: "sexta", recipeId: receita });

    expect(Number((await lerListaDeCompras(db, planId))[0].quantidade_total))
      .toBe(20);
    expect(
      Number((await lerListaDeCompras(db, outroPlano))[0].quantidade_total),
    ).toBe(20);
  });

  it("ignora plano inexistente sem estourar", async () => {
    await expect(
      db.query("select public.generate_shopping_list($1)", [
        "00000000-0000-0000-0000-000000000000",
      ]),
    ).resolves.toBeDefined();
  });
});

describe("cadastro de usuário", () => {
  it("cria o perfil com o nome vindo do metadata do Auth", async () => {
    const { rows } = await db.query<{ nome: string }>(
      "select nome from public.profiles where id = $1",
      [userId],
    );

    expect(rows[0]?.nome).toBe("Davi");
  });

  it("cai para o começo do e-mail quando não há nome", async () => {
    const semNome = await criarUsuario(db, "anonimo@exemplo.com");

    const { rows } = await db.query<{ nome: string }>(
      "select nome from public.profiles where id = $1",
      [semNome],
    );

    expect(rows[0]?.nome).toBe("anonimo");
  });
});
