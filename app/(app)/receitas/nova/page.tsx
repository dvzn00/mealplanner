import type { Metadata } from "next";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { FormularioDeReceita } from "@/components/receitas/formulario-de-receita";
import { listarNomesDeIngredientes } from "@/lib/data/receitas";

export const metadata: Metadata = { title: "Nova receita" };

export default async function PaginaDeNovaReceita() {
  const ingredientes = await listarNomesDeIngredientes();

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Nova receita"
        descricao="Sua receita, com os seus ingredientes. Ela entra na lista de arrastar e soma na lista de compras como qualquer outra."
      />

      <FormularioDeReceita ingredientesConhecidos={ingredientes} />
    </div>
  );
}
