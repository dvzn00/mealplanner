import { describe, expect, it } from "vitest";
import { flexionarUnidade, formatarMedida, formatarQuantidade } from "./unidades";

describe("flexionarUnidade", () => {
  it("usa o singular quando a quantidade é 1", () => {
    expect(flexionarUnidade(1, "unidades")).toBe("unidade");
    expect(flexionarUnidade(1, "pitadas")).toBe("pitada");
    expect(flexionarUnidade(1, "dentes")).toBe("dente");
  });

  it("usa o plural quando não é 1", () => {
    expect(flexionarUnidade(2, "unidade")).toBe("unidades");
    expect(flexionarUnidade(5, "pitada")).toBe("pitadas");
    expect(flexionarUnidade(0.5, "xícara")).toBe("xícaras");
  });

  it("deixa abreviação em paz", () => {
    expect(flexionarUnidade(1, "g")).toBe("g");
    expect(flexionarUnidade(550, "g")).toBe("g");
    expect(flexionarUnidade(200, "ml")).toBe("ml");
  });

  it("devolve intacta a unidade que não conhece", () => {
    expect(flexionarUnidade(3, "cumbuca")).toBe("cumbuca");
  });

  it("não se importa com caixa nem espaço em volta", () => {
    expect(flexionarUnidade(1, "  UNIDADES ")).toBe("unidade");
  });
});

describe("formatarQuantidade", () => {
  it("não inventa casas decimais", () => {
    expect(formatarQuantidade(2)).toBe("2");
    expect(formatarQuantidade(550)).toBe("550");
  });

  it("usa vírgula decimal", () => {
    expect(formatarQuantidade(0.5)).toBe("0,5");
  });
});

describe("formatarMedida", () => {
  it("junta quantidade e unidade já flexionada", () => {
    expect(formatarMedida(1, "unidades")).toBe("1 unidade");
    expect(formatarMedida(5, "pitada")).toBe("5 pitadas");
    expect(formatarMedida(550, "g")).toBe("550 g");
    expect(formatarMedida(0.5, "kg")).toBe("0,5 kg");
  });
});
