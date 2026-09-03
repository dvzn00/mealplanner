import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { ListaDeSugestoes } from "@/components/sugestoes/lista-de-sugestoes";
import { obterUsuarioDaSessao } from "@/lib/data/sessao";
import { listarSugestoes } from "@/lib/data/sugestoes";
import { ROTA_LOGIN } from "@/lib/supabase/routes";

export const metadata: Metadata = { title: "Sugestões" };

export default async function PaginaDeSugestoes() {
  const usuario = await obterUsuarioDaSessao();
  if (!usuario) redirect(ROTA_LOGIN);

  const sugestoes = await listarSugestoes(usuario.id);

  return (
    <div className="mx-auto grid max-w-4xl gap-7">
      <CabecalhoDePagina
        titulo="Sugestões"
        descricao="O catálogo do Meal Planner. Importe uma receita para ter a sua cópia, editável e pronta para arrastar."
      />

      {sugestoes.length === 0 ? (
        <EstadoVazio
          tom="lilas"
          icone={Sparkles}
          titulo="O catálogo está vazio"
          descricao="Assim que houver receitas globais, elas aparecem aqui para você importar."
        />
      ) : (
        <ListaDeSugestoes sugestoes={sugestoes} />
      )}
    </div>
  );
}
