import { ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { ItemDaLista } from "@/components/lista-compras/item-da-lista";
import { obterListaDeCompras } from "@/lib/data/lista-compras";
import { formatarPeriodo } from "@/lib/data-iso";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function PaginaDaListaDeCompras() {
  const { plano, pendentes, comprados } = await obterListaDeCompras();
  const total = pendentes.length + comprados.length;

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Lista de compras"
        descricao={
          plano
            ? `Somada a partir das receitas da semana de ${formatarPeriodo(plano.semana_inicio, plano.semana_fim)}.`
            : "A lista aparece assim que houver uma semana planejada."
        }
      />

      {total === 0 ? (
        <EstadoVazio
          tom="coral"
          icone={ShoppingBasket}
          titulo="Nada a comprar ainda"
          descricao="Coloque receitas nos horários da semana e os ingredientes aparecem aqui, já somados."
        />
      ) : (
        <>
          <p className="text-sm text-text-muted">
            {comprados.length} de {total} no carrinho.
          </p>

          {pendentes.length > 0 && (
            <section aria-labelledby="titulo-pendentes" className="grid gap-3">
              <h2
                id="titulo-pendentes"
                className="text-sm font-semibold uppercase tracking-wider text-text-muted"
              >
                Faltam comprar
              </h2>
              <ul className="grid gap-2.5">
                {pendentes.map((item) => (
                  <ItemDaLista key={item.id} item={item} />
                ))}
              </ul>
            </section>
          )}

          {comprados.length > 0 && (
            <section aria-labelledby="titulo-comprados" className="grid gap-3">
              <h2
                id="titulo-comprados"
                className="text-sm font-semibold uppercase tracking-wider text-text-muted"
              >
                Já no carrinho
              </h2>
              <ul className="grid gap-2.5">
                {comprados.map((item) => (
                  <ItemDaLista key={item.id} item={item} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
