import { describe, expect, it } from "vitest";
import {
  diaDaSemanaIso,
  diferencaEmDias,
  ehDataIso,
  formatarDiaEMes,
  formatarPeriodo,
  segundaDaSemana,
  somarDias,
} from "./data-iso";

describe("ehDataIso", () => {
  it("aceita data real", () => {
    expect(ehDataIso("2026-09-07")).toBe(true);
    expect(ehDataIso("2024-02-29")).toBe(true);
  });

  it("recusa data que não existe", () => {
    expect(ehDataIso("2026-02-31")).toBe(false);
    expect(ehDataIso("2026-13-01")).toBe(false);
    expect(ehDataIso("2025-02-29")).toBe(false);
  });

  it("recusa formato errado", () => {
    expect(ehDataIso("2026-9-7")).toBe(false);
    expect(ehDataIso("07/09/2026")).toBe(false);
    expect(ehDataIso("")).toBe(false);
  });
});

describe("somarDias", () => {
  it("anda dentro do mês", () => {
    expect(somarDias("2026-09-07", 6)).toBe("2026-09-13");
  });

  it("atravessa a virada de mês", () => {
    expect(somarDias("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("atravessa a virada de ano", () => {
    expect(somarDias("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("anda para trás", () => {
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("respeita ano bissexto", () => {
    expect(somarDias("2024-02-28", 1)).toBe("2024-02-29");
    expect(somarDias("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("volta ao ponto de partida indo e voltando", () => {
    expect(somarDias(somarDias("2026-09-07", 365), -365)).toBe("2026-09-07");
  });
});

describe("diaDaSemanaIso", () => {
  it("conta a segunda como 1 e o domingo como 7", () => {
    expect(diaDaSemanaIso("2026-08-31")).toBe(1);
    expect(diaDaSemanaIso("2026-09-03")).toBe(4);
    expect(diaDaSemanaIso("2026-09-06")).toBe(7);
  });
});

describe("segundaDaSemana", () => {
  it("recua até a segunda no meio da semana", () => {
    expect(segundaDaSemana("2026-09-03")).toBe("2026-08-31");
  });

  it("devolve o próprio dia quando já é segunda", () => {
    expect(segundaDaSemana("2026-09-07")).toBe("2026-09-07");
  });

  it("no domingo, ainda é a semana que começou na segunda anterior", () => {
    expect(segundaDaSemana("2026-09-13")).toBe("2026-09-07");
  });

  it("atravessa a virada de ano", () => {
    expect(segundaDaSemana("2027-01-01")).toBe("2026-12-28");
  });

  it("é idempotente", () => {
    const uma = segundaDaSemana("2026-09-03");
    expect(segundaDaSemana(uma)).toBe(uma);
  });
});

describe("diferencaEmDias", () => {
  it("conta para frente e para trás", () => {
    expect(diferencaEmDias("2026-09-07", "2026-09-14")).toBe(7);
    expect(diferencaEmDias("2026-09-14", "2026-09-07")).toBe(-7);
    expect(diferencaEmDias("2026-09-07", "2026-09-07")).toBe(0);
  });
});

describe("formatarDiaEMes", () => {
  it("zera à esquerda", () => {
    expect(formatarDiaEMes("2026-09-07")).toBe("07/09");
    expect(formatarDiaEMes("2026-12-25")).toBe("25/12");
  });
});

describe("formatarPeriodo", () => {
  it("junta o mês quando a semana não o atravessa", () => {
    expect(formatarPeriodo("2026-09-07", "2026-09-13")).toBe(
      "7 a 13 de setembro de 2026",
    );
  });

  it("repete o mês quando a semana o atravessa", () => {
    expect(formatarPeriodo("2026-08-31", "2026-09-06")).toBe(
      "31 de agosto a 6 de setembro de 2026",
    );
  });

  it("repete o ano quando a semana o atravessa", () => {
    expect(formatarPeriodo("2026-12-28", "2027-01-03")).toBe(
      "28 de dezembro de 2026 a 3 de janeiro de 2027",
    );
  });
});
