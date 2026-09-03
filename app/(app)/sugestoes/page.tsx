import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";

export const metadata: Metadata = { title: "Sugestões" };

export default function PaginaDeSugestoes() {
  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Sugestões"
        descricao="Ideias de receitas para os horários que ainda estão vazios na sua semana."
      />

      <EstadoVazio
        tom="lilas"
        icone={Sparkles}
        titulo="Ainda não há sugestões"
        descricao="Esta seção vai propor receitas a partir do que já está no seu plano e do que sobra na lista de compras."
      />
    </div>
  );
}
