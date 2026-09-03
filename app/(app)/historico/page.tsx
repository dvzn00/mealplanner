import { History } from "lucide-react";
import type { Metadata } from "next";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";

export const metadata: Metadata = { title: "Histórico" };

export default function PaginaDeHistorico() {
  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Histórico"
        descricao="As semanas que você já planejou, para consultar ou copiar de novo."
      />

      <EstadoVazio
        icone={History}
        titulo="Suas semanas anteriores ficam aqui"
        descricao="Assim que houver mais de uma semana planejada, elas aparecem nesta lista — com a opção de copiar um dia ou a semana inteira."
      />
    </div>
  );
}
