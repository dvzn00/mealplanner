"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DiaDaSemana } from "@/lib/supabase/database.types";
import {
  horarioParaBanco,
  posicoesAlteradas,
  reordenarPorHorario,
} from "./ordenacao";
import {
  criarSlotSchema,
  editarSlotSchema,
  slotSchema,
  type CriarSlotInput,
  type EditarSlotInput,
  type ResultadoDaAcao,
} from "./schemas";

/**
 * As ações do planejamento.
 *
 * Nenhuma delas checa dono: a RLS de `plan_slots` já exige que o plano seja do
 * usuário da sessão, tanto para ler quanto para escrever. Repetir a checagem
 * aqui daria a impressão de que a segurança mora na aplicação — e ela mora no
 * banco.
 *
 * Toda ação que mexe em horário reordena o dia inteiro em seguida, para que
 * `posicao` continue refletindo a ordem cronológica.
 */

const ok: ResultadoDaAcao = { sucesso: true };

function falha(mensagem: string): ResultadoDaAcao {
  return { sucesso: false, erro: mensagem };
}

export async function criarSlot(
  entrada: CriarSlotInput,
): Promise<ResultadoDaAcao> {
  const validado = criarSlotSchema.safeParse(entrada);
  if (!validado.success) {
    return falha(validado.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const { planId, dia, nomeRefeicao, horario, recipeId } = validado.data;
  const supabase = await createClient();

  // Entra no fim do dia; a reordenação logo abaixo põe no lugar certo.
  const { count } = await supabase
    .from("plan_slots")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", planId)
    .eq("dia_da_semana", dia);

  const { error } = await supabase.from("plan_slots").insert({
    plan_id: planId,
    dia_da_semana: dia,
    nome_refeicao: nomeRefeicao,
    horario: horarioParaBanco(horario),
    recipe_id: recipeId,
    posicao: count ?? 0,
  });

  if (error) {
    return falha("Não consegui criar essa refeição. Tente de novo.");
  }

  await reordenarDia(supabase, planId, dia);
  revalidarPlanejamento();

  return ok;
}

export async function editarSlot(
  entrada: EditarSlotInput,
): Promise<ResultadoDaAcao> {
  const validado = editarSlotSchema.safeParse(entrada);
  if (!validado.success) {
    return falha(validado.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();
  const { data: slot, error } = await supabase
    .from("plan_slots")
    .update({
      nome_refeicao: validado.data.nomeRefeicao,
      horario: horarioParaBanco(validado.data.horario),
    })
    .eq("id", validado.data.slotId)
    .select("plan_id, dia_da_semana")
    .maybeSingle();

  if (error || !slot) {
    return falha("Não consegui salvar essa refeição. Tente de novo.");
  }

  await reordenarDia(supabase, slot.plan_id, slot.dia_da_semana);
  revalidarPlanejamento();

  return ok;
}

export async function removerSlot(slotId: string): Promise<ResultadoDaAcao> {
  const validado = slotSchema.safeParse({ slotId });
  if (!validado.success) return falha("Refeição inválida.");

  const supabase = await createClient();
  const { data: slot, error } = await supabase
    .from("plan_slots")
    .delete()
    .eq("id", validado.data.slotId)
    .select("plan_id, dia_da_semana")
    .maybeSingle();

  if (error || !slot) {
    return falha("Não consegui remover essa refeição. Tente de novo.");
  }

  await reordenarDia(supabase, slot.plan_id, slot.dia_da_semana);
  revalidarPlanejamento();

  return ok;
}

/** Tira a receita do horário, mantendo o horário no lugar. */
export async function limparReceitaDoSlot(
  slotId: string,
): Promise<ResultadoDaAcao> {
  const validado = slotSchema.safeParse({ slotId });
  if (!validado.success) return falha("Refeição inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("plan_slots")
    .update({ recipe_id: null })
    .eq("id", validado.data.slotId);

  if (error) {
    return falha("Não consegui tirar a receita daqui. Tente de novo.");
  }

  revalidarPlanejamento();

  return ok;
}

type Cliente = Awaited<ReturnType<typeof createClient>>;

/**
 * Renumera `posicao` de um dia inteiro.
 *
 * A gravação é um `upsert` único de propósito: a restrição
 * `(plan_id, dia_da_semana, posicao)` é adiável, então trocar duas posições
 * dentro de uma transação funciona. Em requisições separadas, a primeira
 * esbarraria na posição que a segunda ainda vai liberar.
 */
async function reordenarDia(
  supabase: Cliente,
  planId: string,
  dia: DiaDaSemana,
) {
  const { data: slots } = await supabase
    .from("plan_slots")
    .select("id, plan_id, dia_da_semana, nome_refeicao, horario, recipe_id, posicao")
    .eq("plan_id", planId)
    .eq("dia_da_semana", dia);

  if (!slots?.length) return;

  const ordenados = reordenarPorHorario(slots);
  if (posicoesAlteradas(slots, ordenados).length === 0) return;

  await supabase.from("plan_slots").upsert(ordenados);
}

function revalidarPlanejamento() {
  revalidatePath("/dashboard");
  revalidatePath("/lista-compras");
}
