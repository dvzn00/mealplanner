import { describe, expect, it } from "vitest";
import {
  horarioParaBanco,
  posicoesAlteradas,
  reordenarPorHorario,
  type SlotOrdenavel,
} from "./ordenacao";

const slot = (id: string, horario: string, posicao: number): SlotOrdenavel => ({
  id,
  horario,
  posicao,
});

describe("reordenarPorHorario", () => {
  it("põe em ordem crescente de horário", () => {
    const ordenados = reordenarPorHorario([
      slot("jantar", "20:00:00", 0),
      slot("cafe", "08:00:00", 1),
      slot("almoco", "12:00:00", 2),
    ]);

    expect(ordenados.map((s) => s.id)).toEqual(["cafe", "almoco", "jantar"]);
  });

  it("numera as posições de zero em diante, sem buracos", () => {
    const ordenados = reordenarPorHorario([
      slot("a", "08:00:00", 7),
      slot("b", "12:00:00", 12),
      slot("c", "20:00:00", 30),
    ]);

    expect(ordenados.map((s) => s.posicao)).toEqual([0, 1, 2]);
  });

  it("desempata horário igual pela posição anterior", () => {
    const ordenados = reordenarPorHorario([
      slot("segundo", "12:00:00", 5),
      slot("primeiro", "12:00:00", 2),
    ]);

    expect(ordenados.map((s) => s.id)).toEqual(["primeiro", "segundo"]);
  });

  it("é estável: reordenar de novo não muda nada", () => {
    const uma = reordenarPorHorario([
      slot("jantar", "20:00:00", 0),
      slot("cafe", "08:00:00", 1),
    ]);

    expect(reordenarPorHorario(uma)).toEqual(uma);
  });

  it("não mexe no array recebido", () => {
    const original = [slot("jantar", "20:00:00", 0), slot("cafe", "08:00:00", 1)];
    reordenarPorHorario(original);

    expect(original.map((s) => s.id)).toEqual(["jantar", "cafe"]);
  });

  it("compara `08:00` e `08:00:00` como o mesmo horário", () => {
    const ordenados = reordenarPorHorario([
      slot("b", "09:00", 1),
      slot("a", "08:00:00", 0),
    ]);

    expect(ordenados.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("aguenta o dia vazio", () => {
    expect(reordenarPorHorario([])).toEqual([]);
  });
});

describe("posicoesAlteradas", () => {
  it("devolve só quem mudou de lugar", () => {
    const antes = [slot("a", "20:00:00", 0), slot("b", "08:00:00", 1)];
    const depois = reordenarPorHorario(antes);

    expect(posicoesAlteradas(antes, depois).map((s) => s.id).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("devolve vazio quando a ordem já estava certa", () => {
    const antes = [slot("a", "08:00:00", 0), slot("b", "20:00:00", 1)];

    expect(posicoesAlteradas(antes, reordenarPorHorario(antes))).toEqual([]);
  });
});

describe("horarioParaBanco", () => {
  it("acrescenta os segundos que o banco espera", () => {
    expect(horarioParaBanco("08:00")).toBe("08:00:00");
    expect(horarioParaBanco(" 20:30 ")).toBe("20:30:00");
  });

  it("deixa em paz o que já tem segundos", () => {
    expect(horarioParaBanco("08:00:00")).toBe("08:00:00");
  });
});
