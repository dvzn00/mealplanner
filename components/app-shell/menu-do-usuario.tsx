"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { sair } from "@/lib/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Até duas letras: primeira do primeiro nome, primeira do último. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";

  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

  return `${primeira}${ultima}`.toUpperCase();
}

export function MenuDoUsuario({ nome, email }: { nome: string; email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Conta de ${nome}`}
          className="flex items-center gap-2.5 rounded-pill py-1 pl-1 pr-3 transition-colors hover:bg-gray-light-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary-deep">
              {iniciais(nome)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium text-text-dark sm:block">
            {nome}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate font-medium text-text-dark">{nome}</span>
          <span className="truncate text-xs font-normal text-text-muted">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRound strokeWidth={1.75} aria-hidden="true" />
            Perfil
          </Link>
        </DropdownMenuItem>

        <form action={sair}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut strokeWidth={1.75} aria-hidden="true" />
              Sair
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** O botão de sair visível na navbar, sem precisar abrir o menu. */
export function BotaoDeSair() {
  return (
    <form action={sair} className="hidden sm:block">
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label="Sair da conta"
        className="text-text-muted hover:text-secondary-deep"
      >
        <LogOut className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </form>
  );
}
