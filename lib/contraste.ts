/**
 * Contraste WCAG 2.1, para conferir a paleta sem sair do projeto.
 *
 * Limiares: 4.5:1 para texto corrido, 3:1 para texto grande e para
 * componentes de interface (bordas, indicadores de foco).
 */

export function corParaRgb(hex: string): [number, number, number] {
  const limpo = hex.trim().replace("#", "");
  const completo =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;

  if (!/^[0-9a-f]{6}$/i.test(completo)) {
    throw new Error(`cor inválida: ${hex}`);
  }

  return [
    Number.parseInt(completo.slice(0, 2), 16),
    Number.parseInt(completo.slice(2, 4), 16),
    Number.parseInt(completo.slice(4, 6), 16),
  ];
}

function canal(valor: number): number {
  const normalizado = valor / 255;

  return normalizado <= 0.04045
    ? normalizado / 12.92
    : ((normalizado + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const [r, g, b] = corParaRgb(hex).map(canal);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Sempre ≥ 1. `contraste("#fff", "#000")` devolve 21. */
export function contraste(umaCor: string, outraCor: string): number {
  const a = luminancia(umaCor);
  const b = luminancia(outraCor);
  const clara = Math.max(a, b);
  const escura = Math.min(a, b);

  return (clara + 0.05) / (escura + 0.05);
}
