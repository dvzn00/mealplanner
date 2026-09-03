/**
 * Datas civis como texto `YYYY-MM-DD`, sem `Date` e sem fuso.
 *
 * Um plano semanal não tem hora nem lugar: 7 de setembro é 7 de setembro em
 * qualquer canto do mundo. Passar isso por `Date` convida o bug clássico —
 * `new Date("2026-09-07")` vira meia-noite UTC, que em Brasília é dia 6 às 21h,
 * e a semana inteira escorrega um dia.
 *
 * Toda a aritmética aqui é sobre inteiros, pelo algoritmo de dias civis de
 * Howard Hinnant. O único ponto que consulta o relógio é `hojeIso()`.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export function ehDataIso(valor: string): boolean {
  const partes = ISO.exec(valor);
  if (!partes) return false;

  const [, ano, mes, dia] = partes.map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;

  // A ida e volta rejeita 31 de fevereiro sem tabela de dias por mês.
  return paraIso(paraDias(ano, mes, dia)) === valor;
}

function partesDe(iso: string): [number, number, number] {
  const partes = ISO.exec(iso);
  if (!partes) throw new Error(`data fora do formato YYYY-MM-DD: ${iso}`);

  return [Number(partes[1]), Number(partes[2]), Number(partes[3])];
}

/** Dias desde 1970-01-01. Negativo antes disso. */
function paraDias(ano: number, mes: number, dia: number): number {
  const y = ano - (mes <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const anoNaEra = y - era * 400;
  const diaNoAno =
    Math.floor((153 * (mes + (mes > 2 ? -3 : 9)) + 2) / 5) + dia - 1;
  const diaNaEra =
    anoNaEra * 365 +
    Math.floor(anoNaEra / 4) -
    Math.floor(anoNaEra / 100) +
    diaNoAno;

  return era * 146097 + diaNaEra - 719468;
}

function paraIso(dias: number): string {
  const z = dias + 719468;
  const era = Math.floor(z / 146097);
  const diaNaEra = z - era * 146097;
  const anoNaEra = Math.floor(
    (diaNaEra -
      Math.floor(diaNaEra / 1460) +
      Math.floor(diaNaEra / 36524) -
      Math.floor(diaNaEra / 146096)) /
      365,
  );
  const y = anoNaEra + era * 400;
  const diaNoAno =
    diaNaEra -
    (365 * anoNaEra +
      Math.floor(anoNaEra / 4) -
      Math.floor(anoNaEra / 100));
  const mesDeslocado = Math.floor((5 * diaNoAno + 2) / 153);
  const dia = diaNoAno - Math.floor((153 * mesDeslocado + 2) / 5) + 1;
  const mes = mesDeslocado + (mesDeslocado < 10 ? 3 : -9);
  const ano = y + (mes <= 2 ? 1 : 0);

  return `${String(ano).padStart(4, "0")}-${dois(mes)}-${dois(dia)}`;
}

function dois(valor: number): string {
  return String(valor).padStart(2, "0");
}

export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = partesDe(iso);

  return paraIso(paraDias(ano, mes, dia) + dias);
}

/** Dia da semana ISO: 1 na segunda-feira, 7 no domingo. */
export function diaDaSemanaIso(iso: string): number {
  const [ano, mes, dia] = partesDe(iso);
  // 1970-01-01 caiu numa quinta-feira, que é 4 na contagem ISO.
  return ((((paraDias(ano, mes, dia) + 3) % 7) + 7) % 7) + 1;
}

/** A segunda-feira da semana de uma data. */
export function segundaDaSemana(iso: string): string {
  return somarDias(iso, -(diaDaSemanaIso(iso) - 1));
}

/** Quantos dias separam duas datas. Negativo quando `ate` vem antes. */
export function diferencaEmDias(de: string, ate: string): number {
  const [a1, m1, d1] = partesDe(de);
  const [a2, m2, d2] = partesDe(ate);

  return paraDias(a2, m2, d2) - paraDias(a1, m1, d1);
}

/**
 * A data de hoje, em UTC — o mesmo fuso do `current_date` do Postgres no
 * Supabase. É o único lugar do sistema que lê o relógio.
 */
export function hojeIso(): string {
  const agora = new Date();

  return `${agora.getUTCFullYear()}-${dois(agora.getUTCMonth() + 1)}-${dois(
    agora.getUTCDate(),
  )}`;
}

/** `"2026-09-07"` vira `"07/09"`. */
export function formatarDiaEMes(iso: string): string {
  const [, mes, dia] = partesDe(iso);

  return `${dois(dia)}/${dois(mes)}`;
}

/**
 * O período de uma semana, em português corrido:
 *   "7 a 13 de setembro de 2026"
 *   "31 de agosto a 6 de setembro de 2026"
 *   "28 de dezembro de 2026 a 3 de janeiro de 2027"
 */
export function formatarPeriodo(inicio: string, fim: string): string {
  const [anoA, mesA, diaA] = partesDe(inicio);
  const [anoB, mesB, diaB] = partesDe(fim);

  if (anoA !== anoB) {
    return `${diaA} de ${MESES[mesA - 1]} de ${anoA} a ${diaB} de ${MESES[mesB - 1]} de ${anoB}`;
  }

  if (mesA !== mesB) {
    return `${diaA} de ${MESES[mesA - 1]} a ${diaB} de ${MESES[mesB - 1]} de ${anoA}`;
  }

  return `${diaA} a ${diaB} de ${MESES[mesA - 1]} de ${anoA}`;
}
