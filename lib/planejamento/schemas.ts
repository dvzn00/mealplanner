import { z } from "zod";
import { DIAS_DA_SEMANA } from "@/lib/supabase/database.types";

/**
 * Entrada dos formulários do planejamento. O mesmo schema valida no cliente,
 * pelo `zodResolver`, e no servidor, antes de tocar o banco.
 */

export const horarioSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM, de 00:00 a 23:59");

const nomeDaRefeicao = z
  .string()
  .trim()
  .min(2, "Dê um nome com pelo menos 2 letras")
  .max(40, "Use no máximo 40 caracteres");

const uuid = z.string().uuid("Identificador inválido");

export const criarSlotSchema = z.object({
  planId: uuid,
  dia: z.enum(DIAS_DA_SEMANA),
  nomeRefeicao: nomeDaRefeicao,
  horario: horarioSchema,
  recipeId: uuid.nullable().default(null),
});

export const editarSlotSchema = z.object({
  slotId: uuid,
  nomeRefeicao: nomeDaRefeicao,
  horario: horarioSchema,
});

export const slotSchema = z.object({ slotId: uuid });

export const atribuirReceitaSchema = z.object({
  slotId: uuid,
  receitaId: uuid.nullable(),
});

export const moverReceitaSchema = z.object({
  origemId: uuid,
  destinoId: uuid,
});

export type CriarSlotInput = z.input<typeof criarSlotSchema>;
export type EditarSlotInput = z.infer<typeof editarSlotSchema>;

/** O que uma ação do planejamento devolve. */
export interface ResultadoDaAcao {
  sucesso: boolean;
  erro?: string;
}
