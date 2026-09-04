import { describe, expect, it } from "vitest";
import { receitaSchema, type ReceitaInput } from "./schemas";

function receita(parcial: Partial<ReceitaInput> = {}): unknown {
  return {
    nome: "Panqueca de aveia",
    modo_preparo: "Misture tudo e leve à frigideira.",
    tempo_preparo: 15,
    porcoes: 2,
    calorias: 320,
    ingredientes: [{ nome: "Aveia em flocos", quantidade: 60, unidade: "g" }],
    ...parcial,
  };
}

describe("receitaSchema", () => {
  it("aceita uma receita completa", () => {
    expect(receitaSchema.safeParse(receita()).success).toBe(true);
  });

  it("a descrição é opcional", () => {
    expect(receitaSchema.safeParse(receita({ descricao: "" })).success).toBe(
      true,
    );
  });

  it("recusa nome curto demais", () => {
    const resultado = receitaSchema.safeParse(receita({ nome: "Pá" }));
    expect(resultado.success).toBe(false);
  });

  it("recusa modo de preparo vago", () => {
    expect(
      receitaSchema.safeParse(receita({ modo_preparo: "misture" })).success,
    ).toBe(false);
  });

  it("recusa receita sem ingrediente", () => {
    const resultado = receitaSchema.safeParse(receita({ ingredientes: [] }));
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toMatch(/pelo menos um/);
  });

  it("recusa quantidade zero ou negativa", () => {
    expect(
      receitaSchema.safeParse(
        receita({
          ingredientes: [{ nome: "Sal", quantidade: 0, unidade: "g" }],
        }),
      ).success,
    ).toBe(false);
  });

  it("recusa tempo e porções fracionados", () => {
    expect(receitaSchema.safeParse(receita({ tempo_preparo: 7.5 })).success).toBe(
      false,
    );
    expect(receitaSchema.safeParse(receita({ porcoes: 1.5 })).success).toBe(
      false,
    );
  });

  it("aceita quantidade fracionada — meia xícara existe", () => {
    expect(
      receitaSchema.safeParse(
        receita({
          ingredientes: [{ nome: "Farinha", quantidade: 0.5, unidade: "xícara" }],
        }),
      ).success,
    ).toBe(true);
  });

  it("dá mensagem legível para campo numérico vazio", () => {
    // Um `<input type="number">` vazio com valueAsNumber vira NaN.
    const resultado = receitaSchema.safeParse(
      receita({ calorias: Number.NaN }),
    );

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toBe("Informe as calorias");
  });

  it("apara os espaços das pontas", () => {
    const resultado = receitaSchema.safeParse(receita({ nome: "  Sopa  " }));
    expect(resultado.success && resultado.data.nome).toBe("Sopa");
  });
});
