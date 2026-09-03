export interface SlotOrdenavel {
  id: string;
  horario: string;
  posicao: number;
}

/**
 * A ordem cronológica dos horários de um dia.
 *
 * `posicao` existe para que a interface não precise reordenar a cada render, e
 * para que a ordem sobreviva a horários iguais. O desempate é a posição
 * anterior: quem já estava antes continua antes, o que faz a lista não pular
 * quando alguém coloca dois horários idênticos.
 *
 * Função pura — o banco só recebe o resultado.
 */
export function reordenarPorHorario<T extends SlotOrdenavel>(slots: T[]): T[] {
  return [...slots]
    .sort(
      (a, b) =>
        normalizar(a.horario).localeCompare(normalizar(b.horario)) ||
        a.posicao - b.posicao ||
        a.id.localeCompare(b.id),
    )
    .map((slot, indice) => ({ ...slot, posicao: indice }));
}

/** Só o que mudou de posição — não vale reescrever linha que ficou igual. */
export function posicoesAlteradas<T extends SlotOrdenavel>(
  antes: T[],
  depois: T[],
): T[] {
  const anterior = new Map(antes.map((slot) => [slot.id, slot.posicao]));

  return depois.filter((slot) => anterior.get(slot.id) !== slot.posicao);
}

/** `"8:00"` não existe no banco; `"08:00"` e `"08:00:00"` são o mesmo horário. */
function normalizar(horario: string): string {
  return horario.length === 5 ? `${horario}:00` : horario;
}

/** Do formulário (`"08:00"`) para o banco (`"08:00:00"`). */
export function horarioParaBanco(horario: string): string {
  return normalizar(horario.trim());
}
