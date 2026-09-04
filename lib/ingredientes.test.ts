import { describe, expect, it } from "vitest";
import { chaveDoIngrediente, consolidarIngredientes } from "./ingredientes";

describe("chaveDoIngrediente", () => {
  it("iguala caixa e espaço das pontas, como o índice do banco", () => {
    expect(chaveDoIngrediente("  SAL ")).toBe(chaveDoIngrediente("sal"));
  });

  it("não tira acento — o banco também não tira", () => {
    expect(chaveDoIngrediente("Grão")).not.toBe(chaveDoIngrediente("Grao"));
  });
});

describe("consolidarIngredientes", () => {
  it("soma o mesmo ingrediente na mesma unidade", () => {
    const itens = consolidarIngredientes(
      [
        { nome: "Azeite de oliva", quantidade: 5, unidade: "ml" },
        { nome: "azeite de oliva", quantidade: 10, unidade: "ml" },
      ],
      "Nesta receita",
    );

    expect(itens).toEqual([
      {
        chave: "azeite de oliva",
        nome: "Azeite de oliva",
        quantidade: 15,
        unidade: "ml",
      },
    ]);
  });

  it("recusa o mesmo ingrediente em duas unidades", () => {
    expect(() =>
      consolidarIngredientes(
        [
          { nome: "Farinha", quantidade: 300, unidade: "g" },
          { nome: "Farinha", quantidade: 0.5, unidade: "kg" },
        ],
        "Nesta receita",
      ),
    ).toThrow(/aparece em g e em kg/);
  });

  it("cita onde o conflito aconteceu", () => {
    expect(() =>
      consolidarIngredientes(
        [
          { nome: "Sal", quantidade: 1, unidade: "g" },
          { nome: "Sal", quantidade: 1, unidade: "pitada" },
        ],
        'Receita "Bolo"',
      ),
    ).toThrow(/Receita "Bolo"/);
  });

  it("deixa ingredientes distintos em paz", () => {
    const itens = consolidarIngredientes(
      [
        { nome: "Ovo", quantidade: 2, unidade: "unidades" },
        { nome: "Leite", quantidade: 200, unidade: "ml" },
      ],
      "Nesta receita",
    );

    expect(itens).toHaveLength(2);
  });

  it("aguenta a lista vazia", () => {
    expect(consolidarIngredientes([], "Nesta receita")).toEqual([]);
  });
});
