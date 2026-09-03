import { segundaDaSemanaAtual } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

export interface PlanoDaSemana {
  id: string;
  semana_inicio: string;
  semana_fim: string;
}

type Cliente = Awaited<ReturnType<typeof createClient>>;

const COLUNAS = "id, semana_inicio, semana_fim";

/**
 * O plano que a interface mostra: o da semana corrente, ou o mais recente que
 * o usuário tenha, se ele não abriu o app nesta semana. A RLS já limita as
 * linhas ao dono — não é preciso filtrar por user_id aqui.
 *
 * A navegação entre semanas chega no Prompt 2.
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
