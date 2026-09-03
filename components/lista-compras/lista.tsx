"use client";

import { useState } from "react";
import type { ItemDeCompra } from "@/lib/data/lista-compras";
import { cn } from "@/lib/utils";
import { ItemDaLista, ItemDispensado } from "./item-da-lista";

/**
 * A lista, com o filtro de "só o que falta".
 *
 * O filtro é estado de tela e não vai para a URL: é uma preferência do
 * momento, não algo que se compartilha por link. A lista em si continua vindo
 * pronta do servidor.
 */
export function Lista({
  pendentes,
  comprados,
  dispensados,
}: {
  pendentes: ItemDeCompra[];
  comprados: ItemDeCompra[];
  dispensados: ItemDeCompra[];
}) {
  const [soFaltando, setSoFaltando] = useState(false);
  const total = pendentes.length + comprados.length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {comprados.length} de {total} no carrinho.
        </p>

        {comprados.length > 0 && (
          <button
            type="button"
            aria-pressed={soFaltando}
            onClick={() => setSoFaltando((atual) => !atual)}
            className={cn(
              "rounded-pill border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong",
              soFaltando
                ? "border-primary bg-primary-soft text-primary-deep"
                : "border-border bg-card text-text-muted hover:text-text-dark",
            )}
          >
            Mostrar só o que falta
          </button>
        )}
      </div>

      {pendentes.length > 0 && (
        <Secao titulo="Faltam comprar" id="pendentes">
          {pendentes.map((item) => (
            <ItemDaLista key={item.id} item={item} />
          ))}
        </Secao>
      )}

      {pendentes.length === 0 && total > 0 && (
        <p className="rounded-3xl bg-primary-soft px-6 py-5 text-sm text-primary-deep">
          Tudo no carrinho. Boa feira.
        </p>
      )}

      {comprados.length > 0 && !soFaltando && (
        <Secao titulo="Já no carrinho" id="comprados">
          {comprados.map((item) => (
            <ItemDaLista key={item.id} item={item} />
          ))}
        </Secao>
      )}

      {dispensados.length > 0 && (
        <Secao
          titulo="Dispensados"
          id="dispensados"
          nota="Continuam fora da lista mesmo quando o plano muda."
        >
          {dispensados.map((item) => (
            <ItemDispensado key={item.id} item={item} />
          ))}
        </Secao>
      )}
    </div>
  );
}

function Secao({
  titulo,
  id,
  nota,
  children,
}: {
  titulo: string;
  id: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`secao-${id}`} className="grid gap-3">
      <div>
        <h2
          id={`secao-${id}`}
          className="text-sm font-semibold uppercase tracking-wider text-text-muted"
        >
          {titulo}
        </h2>
        {nota && <p className="mt-1 text-xs text-text-muted">{nota}</p>}
      </div>
      <ul className="grid gap-2.5">{children}</ul>
    </section>
  );
}
