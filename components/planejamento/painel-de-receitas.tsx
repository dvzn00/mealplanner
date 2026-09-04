"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import type { ReceitaParaArrastar } from "@/lib/data/planejamento";
import { ReceitaArrastavel } from "./receita-arrastavel";

/** Quantas receitas o painel mostra quando ainda não há nenhuma favorita. */
const AMOSTRA = 6;

/**
 * O painel de arraste: as favoritas da pessoa, acima da grade.
 *
 * Já foi coluna lateral. O problema é aritmético: sete dias precisam de uns
 * 1000px para o texto não virar reticências, e uma coluna de 260px empurrava a
 * semana para fora da tela em 1440px. A semana é o produto.
 *
 * Também já foi uma faixa rolável com o catálogo inteiro em ordem alfabética.
 * Isso tinha dois problemas. O alfabeto não é um critério que interesse a
 * ninguém — as cinco primeiras receitas não são as que você usa —, e no celular
 * só duas cabiam por vez. Arrastar deixava de ser um atalho e virava um
 * obstáculo.
 *
 * Agora são as favoritas, em grade: duas colunas no celular, seis no desktop.
 * Seis cabem na tela em qualquer largura, sem rolar, que é o mínimo para o
 * arraste valer a pena. A grade também resolve a rolagem que não rolava — não
 * há mais o que rolar.
 *
 * Nunca um modal: um overlay entre a receita e o horário quebraria o arraste.
 */
export function PainelDeReceitas({
  receitas,
}: {
  receitas: ReceitaParaArrastar[];
}) {
  const favoritas = receitas.filter((receita) => receita.favorita);
  const temFavoritas = favoritas.length > 0;

  // Sem favoritas o painel não fica vazio: mostra uma amostra para haver o que
  // arrastar no primeiro uso, e a dica explica como trocá-la pelas suas.
  const mostradas = temFavoritas ? favoritas : receitas.slice(0, AMOSTRA);

  return (
    <aside
      aria-label="Receitas favoritas para arrastar"
      // `min-w-0` não é enfeite: sem ele o item de grade adota a largura do
      // conteúdo e a página inteira passa a rolar na horizontal no celular.
      className="min-w-0 rounded-3xl bg-card p-4 shadow-card"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-text-dark">
          {temFavoritas ? "Favoritas" : "Receitas"}
        </h2>

        {receitas.length > 0 && (
          <p className="text-xs leading-relaxed text-text-muted">
            {temFavoritas ? (
              <>
                <span className="md:hidden">Arraste, ou toque num horário.</span>
                <span className="hidden md:inline">
                  Arraste para um horário da semana.
                </span>
              </>
            ) : (
              <>Marque estrelas em Minhas receitas para deixá-las aqui.</>
            )}
          </p>
        )}

        <Link
          href="/receitas"
          className="ml-auto rounded-md text-xs font-medium text-primary-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          {temFavoritas ? "Gerenciar" : "Ver todas"}
        </Link>
      </div>

      {receitas.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs leading-relaxed text-text-muted">
          <Star className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          Nenhuma receita ainda. Importe uma sugestão para começar.
        </p>
      ) : (
        /*
          Duas colunas no celular e seis no desktop: em 375px cada cartão fica
          com uns 150px, largura suficiente para o nome em duas linhas em vez
          de virar reticências. Três linhas de dois é o que põe seis na tela.
        */
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {mostradas.map((receita) => (
            <li key={receita.id} className="flex min-w-0">
              <ReceitaArrastavel receita={receita} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
