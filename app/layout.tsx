import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { ProvedorDeTema } from "@/components/tema";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Meal Planner",
    template: "%s · Meal Planner",
  },
  description:
    "Planeje as refeições da semana, arraste receitas para cada horário e receba a lista de compras somada automaticamente.",
};

export const viewport: Viewport = {
  // A barra do navegador no celular também segue o tema — verde da marca no
  // claro, o mesmo fundo da aplicação no escuro.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5dbb63" },
    { media: "(prefers-color-scheme: dark)", color: "#131714" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning` porque o script do tema escreve a classe no
    // <html> antes da hidratação: a divergência é intencional.
    <html
      lang="pt-BR"
      className={`${poppins.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ProvedorDeTema>{children}</ProvedorDeTema>
      </body>
    </html>
  );
}
