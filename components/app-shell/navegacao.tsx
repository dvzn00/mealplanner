"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ehItemAtivo, MENU } from "@/lib/navegacao";
import { cn } from "@/lib/utils";

/**
 * A lista de links. Vive na barra lateral no desktop e dentro do menu
 * deslizante no celular — daí `aoNavegar`, que o menu usa para se fechar.
 */
export function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções do Meal Planner">
      <ul className="grid gap-1">
        {MENU.map(({ href, rotulo, icone: Icone }) => {
          const ativo = ehItemAtivo(href, pathname);

          return (
            <li key={href}>
              <Link
                href={href}
                onClick={aoNavegar}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-pill px-4 py-3 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong",
                  ativo
                    ? "bg-primary-soft font-semibold text-primary-deep"
                    : "font-medium text-text-muted hover:bg-gray-light-2 hover:text-text-dark",
                )}
              >
                <Icone
                  className="size-5 shrink-0"
                  strokeWidth={ativo ? 2.25 : 1.5}
                  aria-hidden="true"
                />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
