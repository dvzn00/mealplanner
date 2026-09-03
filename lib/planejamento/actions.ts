"use server";

import { revalidatePath } from "next/cache";
import {
  exigirLinha,
  falha,
  OK,
  protegida,
  type ResultadoDaAcao,
} from "@/lib/acoes";
import { createClient } from "@/lib/supabase/server";
import type { DiaDaSemana } from "@/lib/supabase/database.types";
import {
  horarioParaBanco,
  posicoesAlteradas,
  reordenarPorHorario,
} from "./ordenacao";
import {
  atribuirReceitaSchema,
  criarSlotSchema,
  editarSlotSchema,
  moverReceitaSchema,
  slotSchema,
  type CriarSlotInput,
  type EditarSlotInput,
} from "./schemas";

/**
 * As ações do planejamento.
 *
 * Nenhuma delas repete a checagem de dono: a RLS de `plan_slots` já exige que
 * o plano seja do usuário da sessão, tanto para ler quanto para escrever.
 * Repetir a regra aqui daria a impressão de que a segurança mora na aplicação
 * — e ela mora no banco.
 *
 * O que a aplicação precisa fazer é notar quando a escrita não alcançou nada.
 * Com RLS, mexer na linha de outra pessoa não dá erro: afeta zero linhas em
 * silêncio. Por isso cada escrita volta com a linha atingida, e a falta dela
 * vira falha em vez de um "salvo" mentiroso.
 *
 * Toda ação que mexe em horário reordena o dia em seguida, para que `posicao`
 * continue refletindo a ordem cronológica.
 */

export async function criarSlot(
  entrada: CriarSlotInput,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui criar essa refeição.", async () => {
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

    const { data: criado, error } = await supabase
      .from("plan_slots")
      .insert({
        plan_id: planId,
        dia_da_semana: dia,
        nome_refeicao: nomeRefeicao,
        horario: horarioParaBanco(horario),
        recipe_id: recipeId,
        posicao: count ?? 0,
      })
      .select("id")
      .maybeSingle();

    const semLinha = exigirLinha(
      error ? null : criado,
      "Não consegui criar essa refeição. Tente de novo.",
    );
    if (semLinha) return semLinha;

    await reordenarDia(supabase, planId, dia);
    revalidarPlanejamento();

    return OK;
  });
}

export async function editarSlot(
  entrada: EditarSlotInput,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui salvar essa refeição.", async () => {
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

    return OK;
  });
}

export async function removerSlot(slotId: string): Promise<ResultadoDaAcao> {
  return protegida("Não consegui remover essa refeição.", async () => {
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

    return OK;
  });
}

/**
 * Põe (ou tira) uma receita de um horário. É o que acontece ao soltar uma
 * receita do painel sobre a grade — se o horário já tinha outra, é substituída.
 */
export async function atribuirReceitaAoSlot(
  slotId: string,
  receitaId: string | null,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui mover essa receita.", async () => {
    const validado = atribuirReceitaSchema.safeParse({ slotId, receitaId });
    if (!validado.success) return falha("Receita ou refeição inválida.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plan_slots")
      .update({ recipe_id: validado.data.receitaId })
      .eq("id", validado.data.slotId)
      .select("id")
      .maybeSingle();

    const semLinha = exigirLinha(
      error ? null : data,
      "Não consegui mover essa receita. Tente de novo.",
    );
    if (semLinha) return semLinha;

    revalidarPlanejamento();

    return OK;
  });
}

/** Tira a receita do horário, mantendo o horário no lugar. */
export async function limparReceitaDoSlot(
  slotId: string,
): Promise<ResultadoDaAcao> {
  const validado = slotSchema.safeParse({ slotId });
  if (!validado.success) return falha("Refeição inválida.");

  return atribuirReceitaAoSlot(validado.data.slotId, null);
}

/**
 * Troca as receitas de dois horários — o mesmo dia ou dias diferentes.
 *
 * É troca, e não mudança de lugar: soltar sobre um horário ocupado devolve a
 * receita que estava lá para o horário de origem. Quando o destino está vazio,
 * o efeito é idêntico ao de mover, que é o caso comum; quando não está, nada
 * do que a pessoa já tinha planejado desaparece em silêncio.
 *
 * As duas linhas vão em um `upsert` só, para a troca acontecer dentro de uma
 * transação.
 */
export async function moverReceitaEntreSlots(
  origemId: string,
  destinoId: string,
): Promise<ResultadoDaAcao> {
  return protegida("Não consegui mover essa receita.", async () => {
    const validado = moverReceitaSchema.safeParse({ origemId, destinoId });
    if (!validado.success) return falha("Refeição inválida.");
    if (validado.data.origemId === validado.data.destinoId) return OK;

    const supabase = await createClient();
    const { data: slots } = await supabase
      .from("plan_slots")
      .select(
        "id, plan_id, dia_da_semana, nome_refeicao, horario, recipe_id, posicao",
      )
      .in("id", [validado.data.origemId, validado.data.destinoId]);

    const origem = slots?.find((slot) => slot.id === validado.data.origemId);
    const destino = slots?.find((slot) => slot.id === validado.data.destinoId);

    if (!origem || !destino) {
      return falha("Não encontrei uma das refeições. Recarregue a página.");
    }

    const { error } = await supabase.from("plan_slots").upsert([
      { ...origem, recipe_id: destino.recipe_id },
      { ...destino, recipe_id: origem.recipe_id },
    ]);

    if (error) {
      return falha("Não consegui mover essa receita. Tente de novo.");
    }

    revalidarPlanejamento();

    return OK;
  });
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
    .select(
      "id, plan_id, dia_da_semana, nome_refeicao, horario, recipe_id, posicao",
    )
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
