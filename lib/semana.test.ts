import { describe, expect, it } from "vitest";
import {
  diaDeHoje,
  formatarHorario,
  formatarIntervalo,
  rotuloDoDia,
  segundaDaSemana,
} from "./semana";

const em = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("segundaDaSemana", () => {
  it("recua até a segunda no meio da semana", () => {
    // 2026-09-03 é uma quinta-feira.
    expect(segundaDaSemana(em("2026-09-03"))).toBe("2026-08-31");
  });

  it("devolve o próprio dia quando já é segunda", () => {
    expect(segundaDaSemana(em("2026-09-07"))).toBe("2026-09-07");
  });

  it("no domingo, ainda é a semana que começou na segunda anterior", () => {
    expect(segundaDaSemana(em("2026-09-13"))).toBe("2026-09-07");
  });

  it("atravessa a virada de mês e de ano", () => {
    expect(segundaDaSemana(em("2027-01-01"))).toBe("2026-12-28");
  });
});

describe("diaDeHoje", () => {
  it("nomeia o dia da referência", () => {
    expect(diaDeHoje(em("2026-08-31"))).toBe("segunda");
    expect(diaDeHoje(em("2026-09-03"))).toBe("quinta");
    expect(diaDeHoje(em("2026-09-06"))).toBe("domingo");
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

describe("formatarIntervalo", () => {
  it("escreve o mês por extenso, sem ponto solto", () => {
    expect(formatarIntervalo("2026-08-31", "2026-09-06")).toBe(
      "31 de agosto a 6 de setembro",
    );
  });

  it("não escorrega de dia por causa de fuso", () => {
    expect(formatarIntervalo("2026-09-07", "2026-09-13")).toBe(
      "7 de setembro a 13 de setembro",
    );
  });
});
