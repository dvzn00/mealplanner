import { CalendarDays, ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { Lista } from "@/components/lista-compras/lista";
import { BotaoDePdf } from "@/components/planejamento/botao-de-pdf";
import { Button } from "@/components/ui/button";
import { ehDataIso, formatarPeriodo, segundaDaSemana } from "@/lib/data-iso";
import { obterListaDeCompras } from "@/lib/data/lista-compras";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function PaginaDaListaDeCompras({
  searchParams,
}: PageProps<"/lista-compras">) {
  const params = await searchParams;
  const semana =
    typeof params.semana === "string" && ehDataIso(params.semana)
      ? segundaDaSemana(params.semana)
      : undefined;

  const { plano, pendentes, comprados, dispensados } =
    await obterListaDeCompras(semana);
  const total = pendentes.length + comprados.length + dispensados.length;

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Lista de compras"
        descricao={
          plano
            ? `Somada a partir das receitas da semana de ${formatarPeriodo(plano.semana_inicio, plano.semana_fim)}.`
            : "A lista aparece assim que houver uma semana planejada."
        }
        acao={
          plano ? (
            <div className="flex flex-wrap items-center gap-3">
              <BotaoDePdf semana={plano.semana_inicio} />
              <Button asChild variant="outline">
                <Link href={`/dashboard?semana=${plano.semana_inicio}`}>
                  <CalendarDays strokeWidth={1.75} aria-hidden="true" />
                  Ver a semana
                </Link>
              </Button>
            </div>
          ) : null
        }
      />

      {total === 0 ? (
        <EstadoVazio
          tom="coral"
          icone={ShoppingBasket}
          titulo="Nada a comprar ainda"
          descricao="Arraste receitas para os horários da semana e os ingredientes aparecem aqui, já somados."
        />
      ) : (
        <Lista
          pendentes={pendentes}
          comprados={comprados}
          dispensados={dispensados}
        />
      )}
    </div>
  );
}
