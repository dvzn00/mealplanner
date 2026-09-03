import { segundaDaSemanaAtual } from "@/lib/semana";
import { createClient } from "@/lib/supabase/server";

export type SituacaoDaSemana = "passada" | "atual" | "futura";

export interface SemanaDoHistorico {
  id: string;
  semanaInicio: string;
  semanaFim: string;
  refeicoesPlanejadas: number;
  totalDeHorarios: number;
  /** Semana de origem, quando este plano nasceu de uma cópia. */
  copiadaDe: string | null;
  situacao: SituacaoDaSemana;
}

/**
 * Todas as semanas do usuário, da mais recente para a mais antiga.
 *
 * O enunciado pede as semanas anteriores. Listar também a atual e as futuras
 * custa nada e evita a pergunta "cadê a semana que eu montei ontem para o mês
 * que vem?" — cada uma vem com a sua etiqueta.
 */
export async function listarHistorico(): Promise<SemanaDoHistorico[]> {
  const supabase = await createClient();

  const { data: planos } = await supabase
    .from("weekly_plans")
    .select("id, semana_inicio, semana_fim")
    .order("semana_inicio", { ascending: false });

  if (!planos?.length) return [];

  const ids = planos.map((plano) => plano.id);

  const [{ data: slots }, { data: copias }] = await Promise.all([
    supabase.from("plan_slots").select("plan_id, recipe_id").in("plan_id", ids),
    supabase
      .from("plan_copies")
      .select("plan_destino_id, plan_origem_id")
      .in("plan_destino_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const semanaPorId = new Map(
    planos.map((plano) => [plano.id, plano.semana_inicio]),
  );

  // A cópia mais recente é a que descreve o plano; as anteriores foram
  // sobrescritas por ela.
  const origemPorDestino = new Map<string, string>();
  for (const copia of copias ?? []) {
    if (origemPorDestino.has(copia.plan_destino_id)) continue;
    const origem = copia.plan_origem_id
      ? semanaPorId.get(copia.plan_origem_id)
      : undefined;
    if (origem) origemPorDestino.set(copia.plan_destino_id, origem);
  }

  const atual = segundaDaSemanaAtual();

  return planos.map((plano) => {
    const doPlano = (slots ?? []).filter((slot) => slot.plan_id === plano.id);

    return {
      id: plano.id,
      semanaInicio: plano.semana_inicio,
      semanaFim: plano.semana_fim,
      refeicoesPlanejadas: doPlano.filter((slot) => slot.recipe_id !== null)
        .length,
      totalDeHorarios: doPlano.length,
      copiadaDe: origemPorDestino.get(plano.id) ?? null,
      situacao:
        plano.semana_inicio === atual
          ? "atual"
          : plano.semana_inicio < atual
            ? "passada"
            : "futura",
    };
  });
}
