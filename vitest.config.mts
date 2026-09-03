import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    // Workers em `forks` não sobem de forma confiável no Windows; threads sim.
    pool: "threads",
    // `threads` compartilha um processo só, e cada arquivo de teste de banco
    // sobe um Postgres em WASM. Três heaps desses ao mesmo tempo derrubam o
    // V8, então os arquivos rodam um depois do outro.
    fileParallelism: false,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
