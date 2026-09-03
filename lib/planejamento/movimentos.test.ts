import { describe, expect, it } from "vitest";
import type { DiaDoPlano, ReceitaDoSlot } from "@/lib/data/planejamento";
import { idDaReceita, idDoSlot, lerAlvo, lerArrastavel } from "./arraste";
import { aplicarMovimento, receitaDoSlot } from "./movimentos";

const omelete: ReceitaDoSlot = {
  id: "r1",
  nome: "Omelete",
  calorias: 150,
  imagem_url: null,
};

const sopa: ReceitaDoSlot = {
  id: "r2",
  nome: "Sopa",
  calorias: 380,
  imagem_url: null,
};

function semana(): DiaDoPlano[] {
  return [
    {
      slug: "segunda",
      longo: "Segunda",
      curto: "Seg",
      dataIso: "2026-09-07",
      dataCurta: "07/09",
      slots: [
        {
          id: "s1",
          dia: "segunda",
          nomeRefeicao: "Café da manhã",
          horario: "08:00:00",
          posicao: 0,
          receita: omelete,
        },
        {
          id: "s2",
          dia: "segunda",
          nomeRefeicao: "Almoço",
          horario: "12:00:00",
          posicao: 1,
          receita: null,
        },
      ],
    },
    {
      slug: "terca",
      longo: "Terça",
      curto: "Ter",
      dataIso: "2026-09-08",
      dataCurta: "08/09",
      slots: [
        {
          id: "s3",
          dia: "terca",
          nomeRefeicao: "Jantar",
          horario: "20:00:00",
          posicao: 0,
          receita: sopa,
        },
      ],
    },
  ];
}

describe("aplicarMovimento — atribuir", () => {
  it("põe a receita no horário vazio", () => {
    const depois = aplicarMovimento(semana(), {
      tipo: "atribuir",
      slotId: "s2",
      receita: sopa,
    });

    expect(receitaDoSlot(depois, "s2")).toEqual(sopa);
  });

  it("substitui a receita que já estava no horário", () => {
    const depois = aplicarMovimento(semana(), {
      tipo: "atribuir",
      slotId: "s1",
      receita: sopa,
    });

    expect(receitaDoSlot(depois, "s1")).toEqual(sopa);
  });

  it("não mexe nos outros horários", () => {
    const depois = aplicarMovimento(semana(), {
      tipo: "atribuir",
      slotId: "s2",
      receita: sopa,
    });

    expect(receitaDoSlot(depois, "s1")).toEqual(omelete);
    expect(receitaDoSlot(depois, "s3")).toEqual(sopa);
  });

  it("não altera o array recebido", () => {
    const antes = semana();
    aplicarMovimento(antes, { tipo: "atribuir", slotId: "s2", receita: sopa });

    expect(receitaDoSlot(antes, "s2")).toBeNull();
  });
});

describe("aplicarMovimento — mover", () => {
  it("leva a receita para o horário vazio e esvazia a origem", () => {
    const depois = aplicarMovimento(semana(), {
      tipo: "mover",
      origemId: "s1",
      destinoId: "s2",
    });

    expect(receitaDoSlot(depois, "s2")).toEqual(omelete);
    expect(receitaDoSlot(depois, "s1")).toBeNull();
  });

  it("troca as duas quando o destino já tem receita", () => {
    const depois = aplicarMovimento(semana(), {
      tipo: "mover",
      origemId: "s1",
      destinoId: "s3",
    });

    expect(receitaDoSlot(depois, "s3")).toEqual(omelete);
    expect(receitaDoSlot(depois, "s1")).toEqual(sopa);
  });

  it("atravessa dias diferentes", () => {
    const depois = aplicarMovimento(semana(), {
      tipo: "mover",
      origemId: "s3",
      destinoId: "s2",
    });

    expect(receitaDoSlot(depois, "s2")).toEqual(sopa);
    expect(receitaDoSlot(depois, "s3")).toBeNull();
  });

  it("soltar no próprio horário não muda nada", () => {
    const antes = semana();
    const depois = aplicarMovimento(antes, {
      tipo: "mover",
      origemId: "s1",
      destinoId: "s1",
    });

    expect(depois).toBe(antes);
  });
});

describe("identificadores de arraste", () => {
  it("vai e volta sem perder o id", () => {
    expect(lerArrastavel(idDaReceita("r1"))).toEqual({
      tipo: "receita",
      receitaId: "r1",
    });
    expect(lerArrastavel(idDoSlot("s1"))).toEqual({
      tipo: "slot",
      slotId: "s1",
    });
  });

  it("ignora id sem prefixo conhecido", () => {
    expect(lerArrastavel("qualquer-coisa")).toBeNull();
  });

  it("só horário serve de alvo", () => {
    expect(lerAlvo(idDoSlot("s1"))).toBe("s1");
    expect(lerAlvo(idDaReceita("r1"))).toBeNull();
  });
});
