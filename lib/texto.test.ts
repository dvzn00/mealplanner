import { describe, expect, it } from "vitest";
import { contemTermo, normalizarTexto } from "./texto";

describe("normalizarTexto", () => {
  it("tira o acento", () => {
    expect(normalizarTexto("Grão-de-bico")).toBe("grao de bico");
    expect(normalizarTexto("Almoço")).toBe("almoco");
    expect(normalizarTexto("Café da manhã")).toBe("cafe da manha");
  });

  it("iguala caixa alta e baixa", () => {
    expect(normalizarTexto("BRÓCOLIS")).toBe(normalizarTexto("brócolis"));
  });

  it("trata hífen como espaço", () => {
    expect(normalizarTexto("grao-de-bico")).toBe("grao de bico");
  });

  it("colapsa espaços das pontas e do meio", () => {
    expect(normalizarTexto("  sopa   de   legumes  ")).toBe("sopa de legumes");
  });
});

describe("contemTermo", () => {
  it("acha ignorando acento", () => {
    expect(contemTermo("brocolis", ["Frango com Brócolis"])).toBe(true);
  });

  it("acha em qualquer um dos textos", () => {
    expect(contemTermo("aveia", ["Vitamina", "Banana", "Aveia em flocos"])).toBe(
      true,
    );
  });

  it("devolve falso quando não acha", () => {
    expect(contemTermo("peixe", ["Omelete", "Claras de ovo"])).toBe(false);
  });

  it("termo vazio não filtra nada", () => {
    expect(contemTermo("   ", ["qualquer coisa"])).toBe(true);
  });

  it("acha pedaço de palavra", () => {
    expect(contemTermo("ome", ["Omelete de claras"])).toBe(true);
  });
});
