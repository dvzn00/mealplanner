interface CabecalhoDePaginaProps {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}

export function CabecalhoDePagina({
  titulo,
  descricao,
  acao,
}: CabecalhoDePaginaProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-text-dark sm:text-3xl">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-text-muted">
            {descricao}
          </p>
        )}
      </div>
      {acao}
    </div>
  );
}
