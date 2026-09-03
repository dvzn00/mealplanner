import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
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
  themeColor: "#5dbb63",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
