import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { FormularioDeReceita } from "@/components/receitas/formulario-de-receita";
import {
  listarNomesDeIngredientes,
  obterReceitaParaEdicao,
} from "@/lib/data/receitas";

export const metadata: Metadata = { title: "Editar receita" };

export default async function PaginaDeEdicaoDeReceita({
  params,
}: PageProps<"/receitas/[id]/editar">) {
  const { id } = await params;

  const [receita, ingredientes] = await Promise.all([
    obterReceitaParaEdicao(id),
    listarNomesDeIngredientes(),
  ]);

  // Receita do catálogo ou de outra pessoa não abre formulário: não haveria
  // como salvar, e a página não deve prometer o que a RLS vai negar.
  if (!receita) notFound();

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Editar receita"
        descricao={`Mudanças em "${receita.valores.nome}" valem para todas as semanas que a usam — a lista de compras se refaz sozinha.`}
      />

      <FormularioDeReceita
        ingredientesConhecidos={ingredientes}
        receita={receita}
      />
    </div>
  );
}
