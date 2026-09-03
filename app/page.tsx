import { CalendarDays, ListChecks, Salad } from "lucide-react";

/**
 * Página temporária da fundação (Bloco 1).
 * Serve para conferir tokens de cor, tipografia Poppins, raios e sombras.
 * Será substituída pela landing/redirect de autenticação no Bloco 4.
 */

const pilares = [
  {
    icon: CalendarDays,
    titulo: "Semana inteira à vista",
    texto: "Segunda a domingo, com horários que você mesmo define.",
    fundo: "bg-primary-soft text-primary-strong",
  },
  {
    icon: Salad,
    titulo: "Receitas onde você quiser",
    texto: "Arraste um prato para o horário e ele fica lá.",
    fundo: "bg-secondary-soft text-secondary-strong",
  },
  {
    icon: ListChecks,
    titulo: "Lista de compras somada",
    texto: "Os ingredientes das receitas do plano se juntam sozinhos.",
    fundo: "bg-tertiary-soft text-tertiary-strong",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-primary px-6 py-16">
      <div className="w-full max-w-3xl rounded-4xl bg-card p-8 shadow-float sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-strong">
          Fundação instalada
        </p>

        <h1 className="mt-3 text-4xl font-bold text-text-dark sm:text-5xl">
          Meal Planner
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-text-muted">
          Planeje as refeições da semana, arraste receitas para cada horário e
          receba a lista de compras somada automaticamente.
        </p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-3">
          {pilares.map(({ icon: Icon, titulo, texto, fundo }) => (
            <li key={titulo} className="flex flex-col gap-3">
              <span
                className={`inline-flex size-11 items-center justify-center rounded-2xl ${fundo}`}
                aria-hidden="true"
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h2 className="text-base font-semibold text-text-dark">
                {titulo}
              </h2>
              <p className="text-sm leading-relaxed text-text-muted">{texto}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 rounded-2xl bg-gray-light-2 px-5 py-4 text-sm text-text-muted">
          Próximo passo: conectar o Supabase, criar as tabelas e as políticas de
          segurança (Bloco 2).
        </p>
      </div>
    </main>
  );
}
