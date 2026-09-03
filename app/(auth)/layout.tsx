import { Marca } from "@/components/marca";

/**
 * Telas de entrada: cartão branco flutuando sobre o verde da marca.
 * As formas curvas ao fundo são decorativas — daí o aria-hidden.
 */
export default function LayoutDeAutenticacao({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-primary px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-24 size-80 rounded-full bg-white/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-white/15 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <Marca tom="claro" />
        </div>

        <div className="rounded-4xl bg-card p-7 shadow-float sm:p-9">
          {children}
        </div>
      </div>
    </div>
  );
}
