import { BookOpen, CalendarDays, ShoppingBasket } from "lucide-react";
import type { Metadata } from "next";
import { CartaoDeNumero } from "@/components/dashboard/cartao-de-numero";
import { SemanaEmRelance } from "@/components/dashboard/semana-em-relance";
import { obterResumoDoDashboard } from "@/lib/data/dashboard";
import { obterUsuarioDaSessao, primeiroNome } from "@/lib/data/sessao";
import { diaDeHoje, formatarIntervalo, segundaDaSemana } from "@/lib/semana";

export const metadata: Metadata = { title: "Dashboard" };

export default async function PaginaDoDashboard() {
  const [usuario, resumo] = await Promise.all([
    obterUsuarioDaSessao(),
    obterResumoDoDashboard(),
  ]);

  const { plano } = resumo;
  const ehSemanaCorrente = plano?.semana_inicio === segundaDaSemana();
  const faltamNaLista = resumo.itensNaLista - resumo.itensComprados;

  return (
    <div className="mx-auto grid max-w-5xl gap-8">
      <header>
        <h1 className="text-2xl font-semibold text-text-dark sm:text-3xl">
          Olá, {usuario ? primeiroNome(usuario.nome) : "tudo bem"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
          {plano
            ? `${ehSemanaCorrente ? "Esta semana" : "Sua última semana"}, de ${formatarIntervalo(plano.semana_inicio, plano.semana_fim)}.`
            : "Sua semana ainda não foi montada."}
        </p>
      </header>

      {plano && (
        <section aria-labelledby="titulo-da-semana" className="grid gap-4">
          <h2
            id="titulo-da-semana"
            className="text-sm font-semibold uppercase tracking-wider text-text-muted"
          >
            A semana de relance
          </h2>
          <SemanaEmRelance
            dias={resumo.dias}
            hoje={ehSemanaCorrente ? diaDeHoje() : null}
          />
        </section>
      )}

      <section aria-label="Resumo" className="grid gap-4 sm:grid-cols-3">
        <CartaoDeNumero
          tom="verde"
          icone={CalendarDays}
          rotulo="Refeições planejadas"
          valor={`${resumo.refeicoesPlanejadas}`}
          detalhe={
            resumo.refeicoesTotais > 0
              ? `de ${resumo.refeicoesTotais} horários da semana`
              : "nenhum horário criado ainda"
          }
        />
        <CartaoDeNumero
          tom="lilas"
          icone={BookOpen}
          href="/receitas"
          rotulo="Receitas disponíveis"
          valor={`${resumo.receitasDisponiveis}`}
          detalhe={
            resumo.receitasProprias > 0
              ? `${resumo.receitasProprias} criadas por você`
              : "todas vindas do catálogo"
          }
        />
        <CartaoDeNumero
          tom="coral"
          icone={ShoppingBasket}
          href="/lista-compras"
          rotulo="Faltam comprar"
          valor={`${faltamNaLista}`}
          detalhe={
            resumo.itensNaLista > 0
              ? `de ${resumo.itensNaLista} itens da semana`
              : "nada a comprar por enquanto"
          }
        />
      </section>

      <p className="rounded-3xl bg-primary-soft px-6 py-5 text-sm leading-relaxed text-primary-deep">
        Arrastar receitas para os horários chega na próxima etapa. Por enquanto,
        a lista de compras já se refaz sozinha sempre que o plano muda.
      </p>
    </div>
  );
}
