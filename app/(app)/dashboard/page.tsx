import { ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BannerSomenteLeitura,
  BotaoCopiarSemana,
} from "@/components/planejamento/acoes-da-semana";
import { BotaoDePdf } from "@/components/planejamento/botao-de-pdf";
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

  const semanaCorrente = segundaDaSemanaAtual();
  const ehSemanaAtual = plano.semanaInicio === semanaCorrente;
  // Semana passada é consulta: dá para ver e copiar, não para editar.
  const somenteLeitura = plano.semanaInicio < semanaCorrente;

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

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/lista-compras?semana=${plano.semanaInicio}`}>
              <ShoppingBasket strokeWidth={1.75} aria-hidden="true" />
              Lista de compras
            </Link>
          </Button>

          <BotaoDePdf semana={plano.semanaInicio} />

          {!somenteLeitura && (
            <BotaoCopiarSemana
              planId={plano.id}
              semanaDoPlano={plano.semanaInicio}
            />
          )}

          <NavegacaoDeSemanas
            semanaInicio={plano.semanaInicio}
            semanaFim={plano.semanaFim}
          />
        </div>
      </header>

      {somenteLeitura && <BannerSomenteLeitura planId={plano.id} />}

      <PlanejadorSemanal
        plano={plano}
        receitas={receitas}
        receitasParaEscolha={receitas.map(({ id, nome }) => ({ id, nome }))}
        diaDeHoje={ehSemanaAtual ? diaDeHoje() : null}
        somenteLeitura={somenteLeitura}
      />
    </div>
  );
}
