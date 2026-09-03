"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ehDataIso, segundaDaSemana } from "@/lib/data-iso";
import { garantirPlanoParaSemana, type Cliente } from "@/lib/data/planejamento";
import {
  DIAS_DA_SEMANA,
  type DiaDaSemana,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { falha, OK, protegida, type ResultadoDaAcao } from "@/lib/acoes";

/**
 * Copiar cardápio.
 *
 * A cópia **substitui** o destino: quem manda "copiar segunda para quarta"
 * quer que quarta fique igual a segunda, não que ganhe seis refeições. Por
 * isso o destino é limpo antes.
 *
 * A limpeza e a inserção vão em duas requisições, ou seja, duas transações.
 * Se a segunda falhar, o destino fica vazio — e é justamente o estado que a
 * página sabe consertar: ao abrir uma semana sem nenhum horário, ela recria os
 * três padrão. Falha visível e recuperável, em vez de meio cardápio.
 *
 * A lista de compras do destino não precisa de nada: o gatilho de `plan_slots`
 * a refaz dentro da mesma transação da escrita.
 */

const semanaSchema = z
  .string()
  .refine(ehDataIso, "Escolha uma data válida")
  .transform(segundaDaSemana);

const copiarDiaSchema = z.object({
  planOrigemId: z.string().uuid(),
  diaOrigem: z.enum(DIAS_DA_SEMANA),
  semanaDestino: semanaSchema,
  diaDestino: z.enum(DIAS_DA_SEMANA),
});

const copiarSemanaSchema = z.object({
  planOrigemId: z.string().uuid(),
  semanaDestino: semanaSchema,
});

export type CopiarDiaInput = z.input<typeof copiarDiaSchema>;
export type CopiarSemanaInput = z.input<typeof copiarSemanaSchema>;

const CAMPOS = "dia_da_semana, nome_refeicao, horario, recipe_id, posicao";

export async function copiarDia(
  entrada: CopiarDiaInput,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui copiar esse dia.", async () => {
    const validado = copiarDiaSchema.safeParse(entrada);
    if (!validado.success) {
      return falha(validado.error.issues[0]?.message ?? "Dados inválidos.");
    }

    const { planOrigemId, diaOrigem, semanaDestino, diaDestino } =
      validado.data;
    const supabase = await createClient();

    const destino = await garantirPlanoParaSemana(supabase, semanaDestino);
    if (!destino) return falha("Não consegui abrir a semana de destino.");

    if (destino.id === planOrigemId && diaOrigem === diaDestino) {
      return OK;
    }

    const { data: origem, error: erroLeitura } = await supabase
      .from("plan_slots")
      .select(CAMPOS)
      .eq("plan_id", planOrigemId)
      .eq("dia_da_semana", diaOrigem)
      .order("posicao");

    if (erroLeitura) return falha("Não consegui ler o dia de origem.");

    const { error: erroLimpeza } = await supabase
      .from("plan_slots")
      .delete()
      .eq("plan_id", destino.id)
      .eq("dia_da_semana", diaDestino);

    if (erroLimpeza) return falha("Não consegui limpar o dia de destino.");

    const copias = (origem ?? []).map((slot, indice) => ({
      plan_id: destino.id,
      dia_da_semana: diaDestino,
      nome_refeicao: slot.nome_refeicao,
      horario: slot.horario,
      recipe_id: slot.recipe_id,
      posicao: indice,
    }));

    if (copias.length > 0) {
      const { error } = await supabase.from("plan_slots").insert(copias);
      if (error) return falha("Não consegui copiar as refeições.");
    }

    await registrarCopia(supabase, {
      tipo: "dia",
      planOrigemId,
      planDestinoId: destino.id,
      diaOrigem,
    });

    revalidar();

    return OK;
  });
}

export async function copiarSemana(
  entrada: CopiarSemanaInput,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui copiar essa semana.", async () => {
    const validado = copiarSemanaSchema.safeParse(entrada);
    if (!validado.success) {
      return falha(validado.error.issues[0]?.message ?? "Dados inválidos.");
    }

    const { planOrigemId, semanaDestino } = validado.data;
    const supabase = await createClient();

    const destino = await garantirPlanoParaSemana(supabase, semanaDestino);
    if (!destino) return falha("Não consegui abrir a semana de destino.");
    if (destino.id === planOrigemId) {
      return falha("A semana de destino é a mesma de origem.");
    }

    const { data: origem, error: erroLeitura } = await supabase
      .from("plan_slots")
      .select(CAMPOS)
      .eq("plan_id", planOrigemId)
      .order("posicao");

    if (erroLeitura) return falha("Não consegui ler a semana de origem.");

    const { error: erroLimpeza } = await supabase
      .from("plan_slots")
      .delete()
      .eq("plan_id", destino.id);

    if (erroLimpeza) return falha("Não consegui limpar a semana de destino.");

    const copias = (origem ?? []).map((slot) => ({
      plan_id: destino.id,
      dia_da_semana: slot.dia_da_semana,
      nome_refeicao: slot.nome_refeicao,
      horario: slot.horario,
      recipe_id: slot.recipe_id,
      posicao: slot.posicao,
    }));

    if (copias.length > 0) {
      const { error } = await supabase.from("plan_slots").insert(copias);
      if (error) return falha("Não consegui copiar a semana.");
    }

    await registrarCopia(supabase, {
      tipo: "semana",
      planOrigemId,
      planDestinoId: destino.id,
    });

    revalidar();

    return OK;
  });
}

/**
 * O histórico de cópias é informativo — um badge "copiado de tal semana". Se
 * a gravação falhar, a cópia em si já aconteceu e não vale desfazê-la por
 * causa do registro.
 */
async function registrarCopia(
  supabase: Cliente,
  copia: {
    tipo: "dia" | "semana";
    planOrigemId: string;
    planDestinoId: string;
    diaOrigem?: DiaDaSemana;
  },
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("plan_copies").insert({
    user_id: user.id,
    plan_origem_id: copia.planOrigemId,
    plan_destino_id: copia.planDestinoId,
    tipo: copia.tipo,
    dia_origem: copia.diaOrigem ?? null,
  });
}

function revalidar() {
  revalidatePath("/dashboard");
  revalidatePath("/lista-compras");
  revalidatePath("/historico");
}
