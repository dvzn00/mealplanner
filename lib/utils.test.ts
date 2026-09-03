import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("descarta a classe conflitante anterior", () => {
    expect(cn("bg-primary", "bg-secondary")).toBe("bg-secondary");
  });

  it("ignora valores falsos vindos de condicionais", () => {
    expect(cn("rounded-pill", false && "hidden", undefined)).toBe(
      "rounded-pill",
    );
  });
});
