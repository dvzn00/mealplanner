import { describe, expect, it } from "vitest";
import { diaDaData, formatarHorario, rotuloDoDia } from "./semana";

describe("diaDaData", () => {
  it("nomeia o dia de uma data ISO", () => {
    expect(diaDaData("2026-08-31")).toBe("segunda");
    expect(diaDaData("2026-09-03")).toBe("quinta");
    expect(diaDaData("2026-09-06")).toBe("domingo");
  });
});

describe("rotuloDoDia", () => {
  it("põe o acento que o banco não guarda", () => {
    expect(rotuloDoDia("terca")).toBe("Terça");
    expect(rotuloDoDia("sabado")).toBe("Sábado");
  });
});

describe("formatarHorario", () => {
  it("corta os segundos", () => {
    expect(formatarHorario("08:00:00")).toBe("08:00");
    expect(formatarHorario("20:30:00")).toBe("20:30");
  });
});
