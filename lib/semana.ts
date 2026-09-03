import { diaDaSemanaIso, hojeIso, segundaDaSemana } from "@/lib/data-iso";
import type { DiaDaSemana } from "@/lib/supabase/database.types";

/**
 * A semana do Meal Planner: segunda a domingo.
 *
 * O banco guarda o dia como slug sem acento; o rótulo com acento nasce aqui.
 * A aritmética de datas mora em `lib/data-iso.ts` — este módulo só traduz
 * entre a data e o vocabulário do produto.
 */

export interface Dia {
  slug: DiaDaSemana;
  curto: string;
  longo: string;
}

export const DIAS: readonly Dia[] = [
  { slug: "segunda", curto: "Seg", longo: "Segunda" },
  { slug: "terca", curto: "Ter", longo: "Terça" },
  { slug: "quarta", curto: "Qua", longo: "Quarta" },
  { slug: "quinta", curto: "Qui", longo: "Quinta" },
  { slug: "sexta", curto: "Sex", longo: "Sexta" },
  { slug: "sabado", curto: "Sáb", longo: "Sábado" },
  { slug: "domingo", curto: "Dom", longo: "Domingo" },
];

const POR_SLUG = new Map(DIAS.map((dia) => [dia.slug, dia]));

export function rotuloDoDia(slug: DiaDaSemana): string {
  return POR_SLUG.get(slug)?.longo ?? slug;
}

/** O dia da semana de uma data ISO. */
export function diaDaData(iso: string): DiaDaSemana {
  return DIAS[diaDaSemanaIso(iso) - 1].slug;
}

/** A segunda-feira da semana corrente, em `YYYY-MM-DD`. */
export function segundaDaSemanaAtual(): string {
  return segundaDaSemana(hojeIso());
}

/** O slug de hoje, para destacar a coluna certa na grade. */
export function diaDeHoje(): DiaDaSemana {
  return diaDaData(hojeIso());
}

/** `"08:00:00"` vira `"08:00"`. O banco guarda segundos; ninguém quer lê-los. */
export function formatarHorario(horario: string): string {
  return horario.slice(0, 5);
}
