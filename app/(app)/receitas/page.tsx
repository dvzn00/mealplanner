import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { CartaoDeReceita } from "@/components/receitas/cartao-de-receita";
import { listarReceitas } from "@/lib/data/receitas";
import { obterUsuarioDaSessao } from "@/lib/data/sessao";
import { ROTA_LOGIN } from "@/lib/supabase/routes";

export const metadata: Metadata = { title: "Minhas receitas" };

export default async function PaginaDeReceitas() {
  const usuario = await obterUsuarioDaSessao();
  if (!usuario) redirect(ROTA_LOGIN);

  const receitas = await listarReceitas(usuario.id);
  const proprias = receitas.filter((receita) => receita.propria).length;

  return (
    <div className="mx-auto grid max-w-5xl gap-7">
      <CabecalhoDePagina
        titulo="Minhas receitas"
        descricao={
          receitas.length > 0
            ? proprias > 0
              ? `${receitas.length} receitas à mão, ${proprias} criadas por você.`
              : `${receitas.length} receitas do catálogo, prontas para entrar na sua semana.`
            : "As receitas que você pode arrastar para a semana aparecem aqui."
        }
      />

      {receitas.length === 0 ? (
        <EstadoVazio
          tom="lilas"
          icone={BookOpen}
          titulo="Nenhuma receita ainda"
          descricao="Assim que o catálogo for semeado, as receitas aparecem aqui prontas para entrar na sua semana."
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {receitas.map((receita) => (
            <li key={receita.id} className="flex">
              <CartaoDeReceita receita={receita} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
