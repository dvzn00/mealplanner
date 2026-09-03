import type { DiaDaSemana } from "@/lib/supabase/database.types";

/**
 * A semana do Meal Planner: segunda a domingo.
 *
 * O banco guarda o dia como slug sem acento; o rótulo com acento nasce aqui.
 * Todas as contas de data são em UTC, que é o fuso do Postgres do Supabase —
 * é o que faz `segundaDaSemana()` no servidor cair no mesmo dia que
 * `date_trunc('week', current_date)` no banco.
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

/** A segunda-feira da semana de uma data, em `YYYY-MM-DD`. */
export function segundaDaSemana(referencia: Date = new Date()): string {
  const data = new Date(
    Date.UTC(
      referencia.getUTCFullYear(),
      referencia.getUTCMonth(),
      referencia.getUTCDate(),
    ),
  );
  const desdeSegunda = (data.getUTCDay() + 6) % 7;
  data.setUTCDate(data.getUTCDate() - desdeSegunda);

  return data.toISOString().slice(0, 10);
}

/** O slug do dia de hoje, para destacar a coluna certa na semana. */
export function diaDeHoje(referencia: Date = new Date()): DiaDaSemana {
  return DIAS[(referencia.getUTCDay() + 6) % 7].slug;
}

/** `"08:00:00"` vira `"08:00"`. O banco guarda segundos; ninguém quer lê-los. */
export function formatarHorario(horario: string): string {
  return horario.slice(0, 5);
}

const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * `"31 de agosto a 6 de setembro"` — o cabeçalho da semana.
 *
 * Mês por extenso, e não abreviado: "ago." carrega um ponto que colide com a
 * pontuação da frase em volta.
 */
export function formatarIntervalo(inicio: string, fim: string): string {
  const de = DIA_E_MES.format(new Date(`${inicio}T00:00:00Z`));
  const ate = DIA_E_MES.format(new Date(`${fim}T00:00:00Z`));

  return `${de} a ${ate}`;
}

