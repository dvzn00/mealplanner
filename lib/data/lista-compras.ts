import { createClient } from "@/lib/supabase/server";
import { obterPlanoAtual, type PlanoDaSemana } from "./planos";

export interface ItemDeCompra {
  id: string;
  nome: string;
  quantidade_total: number;
  unidade: string;
  comprado: boolean;
}

export interface ListaDeCompras {
  plano: PlanoDaSemana | null;
  pendentes: ItemDeCompra[];
  comprados: ItemDeCompra[];
}

/**
 * A lista do plano corrente, separada entre o que falta e o que já foi.
 *
 * Ninguém escreve nesta tabela pela aplicação: ela é recalculada pelo gatilho
 * de `plan_slots`. O único campo que o usuário move é `comprado`.
 */
export async function obterListaDeCompras(): Promise<ListaDeCompras> {
  const supabase = await createClient();
  const plano = await obterPlanoAtual(supabase);

  if (!plano) {
    return { plano: null, pendentes: [], comprados: [] };
  }

  const { data, error } = await supabase
    .from("shopping_list")
    .select("id, quantidade_total, unidade, comprado, ingredients(nome)")
    .eq("plan_id", plano.id);

  if (error || !data) {
    return { plano, pendentes: [], comprados: [] };
  }

  const itens: ItemDeCompra[] = data
    .map((linha) => ({
      id: linha.id,
      nome: linha.ingredients?.nome ?? "Ingrediente",
      quantidade_total: linha.quantidade_total,
      unidade: linha.unidade,
      comprado: linha.comprado,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    plano,
    pendentes: itens.filter((item) => !item.comprado),
    comprados: itens.filter((item) => item.comprado),
  };
}
