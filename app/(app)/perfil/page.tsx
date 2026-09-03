import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoDePagina } from "@/components/cabecalho-de-pagina";
import { FormularioDePerfil } from "@/components/perfil/formulario-de-perfil";
import { obterUsuarioDaSessao } from "@/lib/data/sessao";
import { ROTA_LOGIN } from "@/lib/supabase/routes";

export const metadata: Metadata = { title: "Perfil" };

export default async function PaginaDePerfil() {
  const usuario = await obterUsuarioDaSessao();
  if (!usuario) redirect(ROTA_LOGIN);

  return (
    <div className="mx-auto grid max-w-3xl gap-7">
      <CabecalhoDePagina
        titulo="Perfil"
        descricao="Como o Meal Planner te chama pelas telas."
      />

      <div className="rounded-3xl bg-card p-6 shadow-card sm:p-8">
        <FormularioDePerfil nome={usuario.nome} email={usuario.email} />
      </div>
    </div>
  );
}
