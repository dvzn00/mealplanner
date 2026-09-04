import { Salad } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarcaProps {
  /**
   * `destacada` põe a marca sobre uma pastilha clara. É o que se usa em cima
   * da cor da marca: o nome em branco direto no verde #5DBB63 dá 2.4:1, que
   * reprova no WCAG — a pastilha resolve sem escurecer a tela inteira.
   */
  tom?: "destacada" | "simples";
  className?: string;
}

export function Marca({ tom = "simples", className }: MarcaProps) {
  const destacada = tom === "destacada";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        destacada && "rounded-pill bg-card py-2.5 pl-2.5 pr-5 shadow-float",
        className,
      )}
    >
      <span
        className="inline-flex size-9 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong"
        aria-hidden="true"
      >
        <Salad className="size-5" strokeWidth={1.75} />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight text-text-dark">
        Meal Planner
      </span>
    </span>
  );
}
