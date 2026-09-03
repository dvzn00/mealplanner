import { segundaDaSemanaAtual } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

export interface PlanoDaSemana {
  id: string;
  semana_inicio: string;
  semana_fim: string;
}

type Cliente = Awaited<ReturnType<typeof createClient>>;

const COLUNAS = "id, semana_inicio, semana_fim";

/** O plano de uma semana específica, se existir. */
export async function obterPlanoDaSemana(
  supabase: Cliente,
  semanaIso: string,
): Promise<PlanoDaSemana | null> {
  const { data } = await supabase
    .from("weekly_plans")
    .select(COLUNAS)
    .eq("semana_inicio", semanaIso)
    .maybeSingle();

  return data ?? null;
}

/**
 * O plano que a interface mostra quando ninguém pediu semana: o da semana
 * corrente, ou o mais recente que o usuário tenha. A RLS já limita as linhas
 * ao dono — não é preciso filtrar por user_id aqui.
 */
export async function obterPlanoAtual(
  supabase: Cliente,
): Promise<PlanoDaSemana | null> {
  const { data: daSemana } = await supabase
    .from("weekly_plans")
    .select(COLUNAS)
    .eq("semana_inicio", segundaDaSemanaAtual())
    .maybeSingle();

  if (daSemana) return daSemana;

  const { data: maisRecente } = await supabase
    .from("weekly_plans")
    .select(COLUNAS)
    .order("semana_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  return maisRecente ?? null;
}
