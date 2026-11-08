import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // La libreria del riconoscimento offline carica da sola i suoi file: non va rielaborata da Vite.
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  worker: { format: "es" },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
