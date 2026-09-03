import type { DiaDoPlano, ReceitaDoSlot } from "@/lib/data/planejamento";

/**
 * O que um arraste faz com a semana, antes de o servidor confirmar.
 *
 * Funções puras: a mesma regra roda no `useOptimistic` da grade e nos testes.
 * O servidor faz a sua própria versão da conta — aqui é só o que a tela mostra
 * enquanto a resposta não chega.
 */

export type Movimento =
  | { tipo: "atribuir"; slotId: string; receita: ReceitaDoSlot }
  | { tipo: "mover"; origemId: string; destinoId: string };

export function aplicarMovimento(
  dias: DiaDoPlano[],
  movimento: Movimento,
): DiaDoPlano[] {
  if (movimento.tipo === "atribuir") {
    return trocarReceitas(dias, {
      [movimento.slotId]: movimento.receita,
    });
  }

  if (movimento.origemId === movimento.destinoId) return dias;

  // Troca em vez de mover: soltar sobre um horário ocupado devolve a receita
  // que estava lá para o horário de origem, em vez de descartá-la.
  return trocarReceitas(dias, {
    [movimento.origemId]: receitaDoSlot(dias, movimento.destinoId),
    [movimento.destinoId]: receitaDoSlot(dias, movimento.origemId),
  });
}

export function receitaDoSlot(
  dias: DiaDoPlano[],
  slotId: string,
): ReceitaDoSlot | null {
  for (const dia of dias) {
    const slot = dia.slots.find((candidato) => candidato.id === slotId);
    if (slot) return slot.receita;
  }

  return null;
}

function trocarReceitas(
  dias: DiaDoPlano[],
  novas: Record<string, ReceitaDoSlot | null>,
): DiaDoPlano[] {
  return dias.map((dia) => ({
    ...dia,
    slots: dia.slots.map((slot) =>
      slot.id in novas ? { ...slot, receita: novas[slot.id] } : slot,
    ),
  }));
}
