import { redirect } from "next/navigation";
import { MenuMobile } from "@/components/app-shell/menu-mobile";
import {
  BotaoDeSair,
  MenuDoUsuario,
} from "@/components/app-shell/menu-do-usuario";
import { AlternarTema } from "@/components/app-shell/alternar-tema";
import { Navegacao } from "@/components/app-shell/navegacao";
import { Toaster } from "@/components/ui/sonner";
import { Marca } from "@/components/marca";
import { obterUsuarioDaSessao } from "@/lib/data/sessao";
import { ROTA_LOGIN } from "@/lib/supabase/routes";

/**
 * A casca das telas autenticadas: barra lateral fixa no desktop, menu
 * deslizante no celular, navbar em cima nos dois.
 *
 * O proxy já barra quem não tem sessão; a checagem aqui é a segunda tranca —
 * e é de onde sai o usuário que a navbar mostra.
 */
export default async function LayoutDoApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obterUsuarioDaSessao();

  if (!usuario) {
    redirect(ROTA_LOGIN);
  }

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="sticky top-0 hidden h-svh w-[16.5rem] shrink-0 flex-col gap-7 border-r border-border bg-card px-3 py-6 lg:flex">
        <div className="px-3">
          <Marca />
        </div>
        <Navegacao />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-5 lg:px-8">
          <MenuMobile />
          <div className="lg:hidden">
            <Marca />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <MenuDoUsuario nome={usuario.nome} email={usuario.email} />
            <AlternarTema />
            <BotaoDeSair />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  );
}
