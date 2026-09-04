"use client";

import { ThemeProvider } from "next-themes";

/**
 * O tema vive numa classe no `<html>`, e as variáveis de `globals.css` fazem
 * o resto — nenhum componente precisa saber que existe um tema escuro.
 *
 * `next-themes` entra por causa do carregamento: sem um script que leia a
 * escolha antes da primeira pintura, a página aparece clara por um instante e
 * pisca para o escuro. Escrever isso à mão é curto e cheio de arestas —
 * armazenamento bloqueado, sincronia entre abas, mudança da preferência do
 * sistema com a página aberta.
 */
export function ProvedorDeTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
