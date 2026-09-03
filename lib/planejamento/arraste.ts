/**
 * Os identificadores que o dnd-kit carrega de um lado para o outro.
 *
 * O mesmo horário é alvo (onde se solta) e origem (a receita que está nele),
 * então os dois prefixos convivem: `slot:` para o horário e `receita:` para um
 * item vindo do painel. Ler o prefixo é o que diz qual ação executar.
 */

export type Arrastavel =
  | { tipo: "receita"; receitaId: string }
  | { tipo: "slot"; slotId: string };

const PREFIXO_RECEITA = "receita:";
const PREFIXO_SLOT = "slot:";

export function idDaReceita(receitaId: string): string {
  return `${PREFIXO_RECEITA}${receitaId}`;
}

export function idDoSlot(slotId: string): string {
  return `${PREFIXO_SLOT}${slotId}`;
}

export function lerArrastavel(id: string): Arrastavel | null {
  if (id.startsWith(PREFIXO_RECEITA)) {
    return { tipo: "receita", receitaId: id.slice(PREFIXO_RECEITA.length) };
  }

  if (id.startsWith(PREFIXO_SLOT)) {
    return { tipo: "slot", slotId: id.slice(PREFIXO_SLOT.length) };
  }

  return null;
}

/** Só horários recebem receita; qualquer outro alvo é ignorado. */
export function lerAlvo(id: string): string | null {
  return id.startsWith(PREFIXO_SLOT) ? id.slice(PREFIXO_SLOT.length) : null;
}
