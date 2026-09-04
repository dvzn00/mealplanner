"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

/**
 * O botão de tema.
 *
 * Ícone e rótulo trocam por CSS, com a variante `dark:`, e não por estado do
 * React. O servidor não sabe qual tema o navegador vai escolher, então
 * qualquer coisa que dependa disso na renderização vira divergência de
 * hidratação — ou obriga a esconder o botão até a página montar, que é pior:
 * um controle que aparece depois é um controle que some antes.
 *
 * Sem `aria-label`: o texto reservado ao leitor de tela é o nome acessível, e
 * ele troca junto com o ícone.
 */
export function AlternarTema() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-text-muted hover:text-primary-deep"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="size-5 dark:hidden" strokeWidth={1.75} aria-hidden="true" />
      <Moon
        className="hidden size-5 dark:block"
        strokeWidth={1.75}
        aria-hidden="true"
      />

      <span className="sr-only dark:hidden">Mudar para o tema escuro</span>
      <span className="sr-only hidden dark:inline">
        Mudar para o tema claro
      </span>
    </Button>
  );
}
