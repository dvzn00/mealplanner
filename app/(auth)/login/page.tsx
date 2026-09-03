import type { Metadata } from "next";
import Link from "next/link";
import { AvisoDoFormulario } from "@/components/auth/campos";
import { FormularioDeLogin } from "@/components/auth/formulario-login";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaDeLogin({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const proximo = typeof params.proximo === "string" ? params.proximo : undefined;
  const falhouConfirmacao = params.erro === "confirmacao";

  return (
    <>
      <h1 className="text-2xl font-semibold text-text-dark">Entrar</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
        Retome o planejamento de onde você parou.
      </p>

      {falhouConfirmacao && (
        <div className="mt-6">
          <AvisoDoFormulario tipo="erro">
            O link de confirmação expirou ou já foi usado. Entre com seu e-mail
            e senha.
          </AvisoDoFormulario>
        </div>
      )}

      <div className="mt-7">
        <FormularioDeLogin proximo={proximo} />
      </div>

      <p className="mt-7 text-center text-sm text-text-muted">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="rounded-md font-medium text-primary-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}
