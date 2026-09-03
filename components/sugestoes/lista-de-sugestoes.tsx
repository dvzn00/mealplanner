"use client";

import { Check, Clock, Flame, Plus, Search, Users } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Sugestao } from "@/lib/data/sugestoes";
import { importarReceita } from "@/lib/receitas/actions";
import { contemTermo } from "@/lib/texto";

export function ListaDeSugestoes({ sugestoes }: { sugestoes: Sugestao[] }) {
  const idDaBusca = useId();
  const [termo, setTermo] = useState("");

  // A busca é local: o catálogo é pequeno e assim ela responde a cada tecla,
  // sem uma ida ao servidor por letra digitada.
  const encontradas = useMemo(
    () =>
      sugestoes.filter((sugestao) =>
        contemTermo(termo, [sugestao.nome, ...sugestao.ingredientes]),
      ),
    [sugestoes, termo],
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Label htmlFor={idDaBusca}>Buscar</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-text-muted"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <Input
            id={idDaBusca}
            type="search"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Nome da receita ou ingrediente"
            className="pl-12"
          />
        </div>
      </div>

      <p className="text-sm text-text-muted" role="status">
        {encontradas.length === sugestoes.length
          ? `${sugestoes.length} receitas no catálogo.`
          : `${encontradas.length} de ${sugestoes.length} receitas.`}
      </p>

      {encontradas.length === 0 ? (
        <p className="rounded-3xl bg-card px-6 py-10 text-center text-sm text-text-muted shadow-card">
          Nenhuma receita com “{termo}”. Tente outro nome ou ingrediente.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {encontradas.map((sugestao) => (
            <li key={sugestao.id} className="flex">
              <CartaoDeSugestao sugestao={sugestao} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoDeSugestao({ sugestao }: { sugestao: Sugestao }) {
  const [importando, iniciarTransicao] = useTransition();

  return (
    <article className="flex w-full flex-col gap-3 rounded-3xl bg-card p-6 shadow-card">
      <h2 className="text-base font-semibold leading-snug text-text-dark">
        {sugestao.nome}
      </h2>

      {sugestao.descricao && (
        <p className="text-sm leading-relaxed text-text-muted">
          {sugestao.descricao}
        </p>
      )}

      <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
        <div className="flex items-center gap-1.5">
          <Flame className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <dt className="sr-only">Calorias</dt>
          <dd>{sugestao.calorias} kcal</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <dt className="sr-only">Tempo de preparo</dt>
          <dd>{sugestao.tempo_preparo} min</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-4" strokeWidth={1.75} aria-hidden="true" />
          <dt className="sr-only">Rende</dt>
          <dd>
            {sugestao.porcoes} {sugestao.porcoes === 1 ? "porção" : "porções"}
          </dd>
        </div>
      </dl>

      {sugestao.ingredientes.length > 0 && (
        <p className="text-xs leading-relaxed text-text-muted">
          <span className="font-medium">Leva:</span>{" "}
          {sugestao.ingredientes.join(", ")}.
        </p>
      )}

      <div className="mt-auto pt-2">
        {sugestao.jaImportada ? (
          <p className="inline-flex items-center gap-2 rounded-pill bg-primary-soft px-4 py-2 text-sm font-medium text-primary-deep">
            <Check className="size-4" strokeWidth={2} aria-hidden="true" />
            Já está nas suas receitas
          </p>
        ) : (
          <Button
            disabled={importando}
            onClick={() =>
              iniciarTransicao(async () => {
                const resultado = await importarReceita(sugestao.id);
                if (resultado.sucesso) {
                  toast.success(`"${sugestao.nome}" entrou nas suas receitas.`);
                } else {
                  toast.error(resultado.erro ?? "Não consegui importar.");
                }
              })
            }
          >
            <Plus strokeWidth={2} aria-hidden="true" />
            {importando ? "Importando…" : "Importar"}
          </Button>
        )}
      </div>
    </article>
  );
}
