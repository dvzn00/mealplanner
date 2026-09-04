import {
  BookOpen,
  CalendarDays,
  History,
  ShoppingBasket,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react";

export interface ItemDeMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
}

/** A navegação do produto, na ordem em que aparece na barra lateral. */
export const MENU: readonly ItemDeMenu[] = [
  { href: "/dashboard", rotulo: "Programação da semana", icone: CalendarDays },
  { href: "/receitas", rotulo: "Minhas receitas", icone: BookOpen },
  { href: "/lista-compras", rotulo: "Lista de compras", icone: ShoppingBasket },
  { href: "/sugestoes", rotulo: "Sugestões", icone: Sparkles },
  { href: "/historico", rotulo: "Histórico", icone: History },
  { href: "/perfil", rotulo: "Perfil", icone: User },
];

/** Um item está ativo na própria rota e nas rotas abaixo dela. */
export function ehItemAtivo(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
