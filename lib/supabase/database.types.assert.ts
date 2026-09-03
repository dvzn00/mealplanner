import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DiaDaSemana, Tables } from "./database.types";

/**
 * Guarda de tipo, sem custo em tempo de execução.
 *
 * `Database` precisa ser escrito com `type`, nunca com `interface`: o
 * supabase-js exige `Record<string, unknown>` em cada linha, e uma interface
 * não tem index signature implícita. Quando isso escorrega, o cliente para de
 * reclamar e passa a devolver `never` em toda consulta — sem erro nenhum até
 * alguém tentar ler um campo.
 *
 * As linhas abaixo falham em `npm run typecheck` se isso voltar a acontecer.
 */
export async function typesDoBancoEstaoLigados(
  supabase: SupabaseClient<Database>,
) {
  const { data: slots } = await supabase
    .from("plan_slots")
    .select("id, dia_da_semana, horario, recipe_id");

  const dia: DiaDaSemana | undefined = slots?.[0]?.dia_da_semana;

  const { data: receita } = await supabase
    .from("recipes")
    .select("*")
    .single();
  const linha: Tables<"recipes"> | null = receita;

  await supabase.from("shopping_list").update({ comprado: true }).eq("id", "");
  await supabase.rpc("generate_shopping_list", { p_plan_id: "" });

  return { dia, linha };
}
