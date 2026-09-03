import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NavegacaoDeSemanas } from "@/components/planejamento/navegacao-de-semanas";
import { PlanejadorSemanal } from "@/components/planejamento/planejador-semanal";
import { ehDataIso, segundaDaSemana } from "@/lib/data-iso";
import { obterOuCriarPlano } from "@/lib/data/planejamento";
import { listarReceitasParaArrastar } from "@/lib/data/receitas";
import { diaDeHoje, segundaDaSemanaAtual } from "@/lib/semana";
import { ROTA_LOGIN } from "@/lib/supabase/routes";

export const metadata: Metadata = { title: "Meu planejamento" };

/** `?semana=` vem da URL, então pode vir qualquer coisa. */
function semanaPedida(valor: string | string[] | undefined): string {
  if (typeof valor === "string" && ehDataIso(valor)) {
    return segundaDaSemana(valor);
  }

  return segundaDaSemanaAtual();
}

export default async function PaginaDoPlanejamento({
  searchParams,
}: PageProps<"/dashboard">) {
  const params = await searchParams;
  const semanaInicio = semanaPedida(params.semana);

  const [plano, receitas] = await Promise.all([
    obterOuCriarPlano(semanaInicio),
    listarReceitasParaArrastar(),
  ]);

  if (!plano) redirect(ROTA_LOGIN);

  const ehSemanaAtual = plano.semanaInicio === segundaDaSemanaAtual();

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-dark sm:text-3xl">
            Meu planejamento
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Sete dias, os horários que você quiser, e a lista de compras se
            refazendo sozinha.
          </p>
        </div>

        <NavegacaoDeSemanas
          semanaInicio={plano.semanaInicio}
          semanaFim={plano.semanaFim}
        />
      </header>

      <PlanejadorSemanal
        plano={plano}
        receitas={receitas}
        receitasParaEscolha={receitas.map(({ id, nome }) => ({ id, nome }))}
        diaDeHoje={ehSemanaAtual ? diaDeHoje() : null}
      />
    </div>
  );
}
