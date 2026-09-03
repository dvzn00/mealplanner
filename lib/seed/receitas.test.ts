import { describe, expect, it } from "vitest";
import { RECEITAS_PADRAO } from "./receitas-padrao";
import {
  catalogoDeIngredientes,
  consolidarIngredientes,
  receitasSeedSchema,
  type ReceitaSeed,
} from "./receitas";

function receita(parcial: Partial<ReceitaSeed> = {}): ReceitaSeed {
  return {
    nome: "Teste",
    modo_preparo: "Misture tudo.",
    tempo_preparo: 10,
    porcoes: 1,
    calorias: 100,
    ingredientes: [{ nome: "Sal", quantidade: 1, unidade: "pitada" }],
    ...parcial,
  };
}

describe("receitasSeedSchema", () => {
  it("aceita as receitas padrão", () => {
    expect(receitasSeedSchema.safeParse(RECEITAS_PADRAO).success).toBe(true);
  });

  it("aceita o formato do briefing", () => {
    const doBriefing = [
      {
        nome: "Omelete de Claras com Espinafre",
        descricao: "Leve e nutritivo, perfeito para o café da manhã.",
        modo_preparo: "Bata as claras, refogue o espinafre, misture e cozinhe.",
        tempo_preparo: 10,
        porcoes: 1,
        calorias: 150,
        ingredientes: [
          { nome: "Claras de ovo", quantidade: 3, unidade: "unidades" },
          { nome: "Espinafre fresco", quantidade: 50, unidade: "g" },
        ],
      },
    ];

    expect(receitasSeedSchema.safeParse(doBriefing).success).toBe(true);
  });

  it("recusa receita sem ingrediente", () => {
    const resultado = receitasSeedSchema.safeParse([
      receita({ ingredientes: [] }),
    ]);

    expect(resultado.success).toBe(false);
  });

  it("recusa quantidade zero ou negativa", () => {
    const resultado = receitasSeedSchema.safeParse([
      receita({
        ingredientes: [{ nome: "Sal", quantidade: 0, unidade: "g" }],
      }),
    ]);

    expect(resultado.success).toBe(false);
  });

  it("recusa tempo de preparo fracionado", () => {
    expect(
      receitasSeedSchema.safeParse([receita({ tempo_preparo: 7.5 })]).success,
    ).toBe(false);
  });
});

describe("catalogoDeIngredientes", () => {
  it("não repete ingrediente citado por várias receitas", () => {
    const catalogo = catalogoDeIngredientes([
      receita({
        nome: "Uma",
        ingredientes: [
          { nome: "Azeite de oliva", quantidade: 5, unidade: "ml" },
          { nome: "Sal", quantidade: 1, unidade: "pitada" },
        ],
      }),
      receita({
        nome: "Outra",
        ingredientes: [
          { nome: "Azeite de oliva", quantidade: 10, unidade: "ml" },
          { nome: "Alho", quantidade: 2, unidade: "dentes" },
        ],
      }),
    ]);

    expect(catalogo.map((i) => i.nome)).toEqual([
      "Azeite de oliva",
      "Sal",
      "Alho",
    ]);
  });

  it("trata maiúscula e minúscula como o mesmo ingrediente", () => {
    const catalogo = catalogoDeIngredientes([
      receita({
        ingredientes: [
          { nome: "Sal", quantidade: 1, unidade: "pitada" },
          { nome: "sal", quantidade: 2, unidade: "pitada" },
          { nome: "  SAL  ", quantidade: 3, unidade: "pitada" },
        ],
      }),
    ]);

    expect(catalogo).toEqual([{ nome: "Sal", unidade_padrao: "pitada" }]);
  });

  it("a unidade padrão é a da primeira aparição", () => {
    const catalogo = catalogoDeIngredientes([
      receita({
        nome: "Primeira",
        ingredientes: [{ nome: "Farinha", quantidade: 300, unidade: "g" }],
      }),
      receita({
        nome: "Segunda",
        ingredientes: [{ nome: "Farinha", quantidade: 0.5, unidade: "kg" }],
      }),
    ]);

    expect(catalogo).toEqual([{ nome: "Farinha", unidade_padrao: "g" }]);
  });

  it("cobre todos os ingredientes das receitas padrão", () => {
    const catalogo = catalogoDeIngredientes(RECEITAS_PADRAO);
    const citados = new Set(
      RECEITAS_PADRAO.flatMap((r) =>
        r.ingredientes.map((i) => i.nome.toLowerCase()),
      ),
    );

    expect(catalogo).toHaveLength(citados.size);
  });
});

describe("consolidarIngredientes", () => {
  it("soma o ingrediente repetido na mesma unidade", () => {
    const itens = consolidarIngredientes(
      receita({
        ingredientes: [
          { nome: "Azeite de oliva", quantidade: 5, unidade: "ml" },
          { nome: "azeite de oliva", quantidade: 10, unidade: "ml" },
        ],
      }),
    );

    expect(itens).toEqual([
      { chave: "azeite de oliva", nome: "Azeite de oliva", quantidade: 15, unidade: "ml" },
    ]);
  });

  it("recusa o mesmo ingrediente em duas unidades", () => {
    expect(() =>
      consolidarIngredientes(
        receita({
          nome: "Bolo",
          ingredientes: [
            { nome: "Farinha", quantidade: 300, unidade: "g" },
            { nome: "Farinha", quantidade: 0.5, unidade: "kg" },
          ],
        }),
      ),
    ).toThrow(/aparece em g e em kg/);
  });

  it("deixa ingredientes distintos em paz", () => {
    const itens = consolidarIngredientes(RECEITAS_PADRAO[0]);

    expect(itens).toHaveLength(RECEITAS_PADRAO[0].ingredientes.length);
  });
});
