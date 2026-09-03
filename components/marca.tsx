import { Salad } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarcaProps {
  /** `claro` para usar sobre o verde; `escuro` para usar sobre branco. */
  tom?: "claro" | "escuro";
  className?: string;
}

export function Marca({ tom = "escuro", className }: MarcaProps) {
  const claro = tom === "claro";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-2xl",
          claro ? "bg-white text-primary-strong" : "bg-primary-soft text-primary-strong",
        )}
        aria-hidden="true"
      >
        <Salad className="size-5" strokeWidth={1.75} />
      </span>
      <span
        className={cn(
          "font-heading text-lg font-semibold tracking-tight",
          claro ? "text-white" : "text-text-dark",
        )}
      >
        Meal Planner
      </span>
    </span>
  );
}
