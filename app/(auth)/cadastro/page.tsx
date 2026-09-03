import type { Metadata } from "next";
import Link from "next/link";
import { FormularioDeCadastro } from "@/components/auth/formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaDeCadastro() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-text-dark">Criar conta</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
        Sua primeira semana já vem montada, pronta para ajustar.
      </p>

      <div className="mt-7">
        <FormularioDeCadastro />
      </div>

      <p className="mt-7 text-center text-sm text-text-muted">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="rounded-md font-medium text-primary-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
