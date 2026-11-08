import fs from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { normalizeBase } from "./src/pwa/basePath";

// I colori dell'app installabile vengono dai token di design, non scritti a mano qui.
const tokens = JSON.parse(fs.readFileSync("replica/design/tokens.json", "utf8")).color as Record<string, string>;

// In locale il sito sta nella radice "/". Su GitHub Pages sta in "/nome-del-repository/": si passa con VITE_BASE.
const base = normalizeBase(process.env.VITE_BASE);

/** Mette nel file index.html il colore della barra del telefono, preso dai token. */
function themeColor(): Plugin {
  return { name: "elodict-theme-color", transformIndexHtml: (html) => html.replaceAll("%THEME_COLOR%", tokens.accent) };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    themeColor(),
    VitePWA({
      // «prompt»: nessun aggiornamento silenzioso; è l'utente a premere «Aggiorna».
      registerType: "prompt",
      injectRegister: false, // ci pensa src/pwa/useAppUpdate.ts
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png", "installa.html"],
      manifest: {
        id: base,
        name: "Elodict",
        short_name: "Elodict",
        description: "Detta con la voce su un foglio A4. Gratis, senza account.",
        lang: "it",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: tokens.bg,
        theme_color: tokens.accent,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Il guscio dell'app (pagina, programma, stili, caratteri, icone) si scarica subito e resta sul dispositivo.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
        // I file del motore di Whisper (decine di MB) NON vanno scaricati all'installazione: si salvano la prima volta che servono.
        globIgnores: ["ort/**", "**/*.wasm", "**/*.mjs"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/installa\.html$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Motore di Whisper: la prima volta dalla rete, poi sempre dalla memoria del dispositivo.
            urlPattern: /\/ort\/ort-wasm[^/]*$/,
            handler: "CacheFirst",
            options: {
              cacheName: "elodict-motore",
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 8 },
            },
          },
        ],
      },
    }),
  ],
  // La libreria del riconoscimento offline carica da sola i suoi file: non va rielaborata da Vite.
  optimizeDeps: { exclude: ["@huggingface/transformers"] },
  worker: { format: "es" },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
