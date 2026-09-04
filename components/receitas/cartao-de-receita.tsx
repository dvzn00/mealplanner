"use client";

import {
  Clock,
  Flame,
  Pencil,
  Star,
  Trash2,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ReceitaDaLista } from "@/lib/data/receitas";
import { alternarFavorita, excluirReceita } from "@/lib/receitas/actions";
import { cn } from "@/lib/utils";

export function CartaoDeReceita({ receita }: { receita: ReceitaDaLista }) {
  const [apagando, iniciarTransicao] = useTransition();

  // Transição própria, e não a de apagar: favoritar não deve apagar o cartão
  // de meio tom enquanto salva.
  const [, iniciarFavorita] = useTransition();
  const [favorita, preverFavorita] = useOptimistic(
    receita.favorita,
    (_atual: boolean, proxima: boolean) => proxima,
  );

  function alternar() {
    const proxima = !favorita;

    iniciarFavorita(async () => {
      preverFavorita(proxima);

      const resultado = await alternarFavorita(receita.id, proxima);
      if (!resultado.sucesso) {
        toast.error(resultado.erro ?? "Não consegui mudar a favorita.");
      }
    });
  }

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-4 rounded-3xl bg-card p-6 shadow-card transition-opacity",
        apagando && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong"
          aria-hidden="true"
        >
          <UtensilsCrossed className="size-5" strokeWidth={1.75} />
        </span>

        <div className="ml-auto flex items-center gap-2">
          {receita.propria && (
            <span className="rounded-pill bg-secondary-soft px-3 py-1 text-xs font-semibold text-secondary-deep">
              Sua receita
            </span>
          )}

          {/*
            `aria-pressed` em vez de dois rótulos diferentes: o leitor de tela
            anuncia "Favoritar — pressionado", que é o estado, não uma ordem
            que muda de texto embaixo do dedo.
          */}
          <button
            type="button"
            onClick={alternar}
            aria-pressed={favorita}
            aria-label={`Favoritar ${receita.nome}`}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-pill transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong",
              favorita
                ? "bg-secondary-soft text-secondary-deep"
                : "text-text-muted hover:bg-secondary-soft hover:text-secondary-deep",
            )}
          >
            <Star
              className={cn("size-5", favorita && "fill-current")}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <h3 className="text-base font-semibold leading-snug text-text-dark">
        {receita.nome}
      </h3>

      {receita.descricao && (
        <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">
          {receita.descricao}
        </p>
      )}

      <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-text-muted">
        <div className="flex items-center gap-1.5">
          <Flame className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <dt className="sr-only">Calorias</dt>
          <dd>{receita.calorias} kcal</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <dt className="sr-only">Tempo de preparo</dt>
          <dd>{receita.tempo_preparo} min</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <dt className="sr-only">Rende</dt>
          <dd>
            {receita.porcoes} {receita.porcoes === 1 ? "porção" : "porções"}
          </dd>
        </div>

        {receita.propria && (
          <Link
            href={`/receitas/${receita.id}/editar`}
            aria-label={`Editar a receita ${receita.nome}`}
            className="ml-auto inline-flex size-8 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-primary-soft hover:text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
          >
            <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )}

        {receita.propria && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={`Apagar a receita ${receita.nome}`}
                disabled={apagando}
                className="inline-flex size-8 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-secondary-soft hover:text-secondary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              >
                <Trash2
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar “{receita.nome}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Os horários que usam esta receita ficam vazios e a lista de
                  compras se refaz. Não dá para desfazer.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Manter</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    iniciarTransicao(async () => {
                      const resultado = await excluirReceita(receita.id);
                      if (resultado.sucesso) {
                        toast.success(`"${receita.nome}" foi apagada.`);
                      } else {
                        toast.error(resultado.erro ?? "Não consegui apagar.");
                      }
                    })
                  }
                >
                  Apagar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </dl>
    </article>
  );
}
