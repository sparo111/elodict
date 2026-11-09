import fs from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { normalizeBase } from "./src/pwa/basePath";
import { strings } from "./src/i18n";

// I colori dell'app installabile vengono dai token di design, non scritti a mano qui.
const tokens = JSON.parse(fs.readFileSync("replica/design/tokens.json", "utf8")).color as Record<string, string>;

// In locale il sito sta nella radice "/". Su GitHub Pages sta in "/nome-del-repository/": si passa con VITE_BASE.
const base = normalizeBase(process.env.VITE_BASE);

/** Mette nel file index.html il colore della barra del telefono, preso dai token. */
function themeColor(): Plugin {
  return { name: "elodict-theme-color", transformIndexHtml: (html) => html.replaceAll("%THEME_COLOR%", tokens.accent) };
}

/**
 * La pagina stampabile "installa.html" è statica e non può leggere i18n.ts: i testi di «Cos'è Elodict»
 * si scrivono da lì in public/installa-testi.js (file generato, non si modifica a mano) a ogni avvio o costruzione.
 */
function installaTesti(): Plugin {
  return {
    name: "elodict-installa-testi",
    buildStart() {
      const out: Record<string, { title: string; items: string[]; dedication: string }> = {};
      for (const [lang, s] of Object.entries(strings)) {
        out[lang] = { title: s.whatTitle, items: [s.what1, s.what2, s.what3, s.what4, s.what5, s.what6, s.what7], dedication: s.dedication };
      }
      fs.writeFileSync("public/installa-testi.js", `window.ELODICT_WHAT = ${JSON.stringify(out)};
`);
    },
  };
}

/**
 * Gli «agganci per le prove» (per esempio far fallire di proposito una migrazione) esistono solo fuori dalla build pubblicata:
 * `vite build` (modalità production) li toglie dal codice; il server di sviluppo e `--mode test` (le copie costruite per le prove) li tengono.
 */
export default defineConfig(({ mode }) => ({
  define: { __ELODICT_TEST_HOOKS__: JSON.stringify(mode !== "production") },
  base,
  plugins: [
    react(),
    themeColor(),
    installaTesti(),
    VitePWA({
      // «prompt»: nessun aggiornamento silenzioso; è l'utente a premere «Aggiorna».
      registerType: "prompt",
      injectRegister: false, // ci pensa src/pwa/useAppUpdate.ts
      includeAssets: ["icons/favicon-32.png", "icons/favicon-48.png", "icons/apple-touch-icon.png", "installa.html"],
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
        // «installa.html» (anche con ?lang=it: l'indirizzo che l'app stessa apre) è una pagina a sé, non l'app: niente ripiego su index.html
        navigateFallbackDenylist: [/installa\.html(\?.*)?$/],
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
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Copertura (npm run coverage): soglie solo sulla logica pura, cartella per cartella. Schermate e funzioni che
    // dipendono dal browser sono provate dalle prove nel browser (Playwright), che questo strumento non misura.
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: [
        "src/commands/**",
        "src/text/**",
        "src/documents/*.ts",
        "src/store/backup.ts",
        "src/audio/devices.ts",
        "src/export/blocks.ts",
        "src/speech/segmenter.ts",
        "src/onboarding/eta.ts",
        "src/onboarding/mic.ts",
        "src/install/detect.ts",
        "src/pwa/basePath.ts",
      ],
      exclude: ["**/*.test.ts", "src/commands/types.ts"],
      thresholds: Object.fromEntries(
        [
          "src/commands/**",
          "src/text/**",
          "src/documents/*.ts",
          "src/store/backup.ts",
          "src/audio/devices.ts",
          "src/export/blocks.ts",
          "src/speech/segmenter.ts",
          "src/onboarding/eta.ts",
          "src/onboarding/mic.ts",
          "src/install/detect.ts",
          "src/pwa/basePath.ts",
        ].map((glob) => [glob, { lines: 90, branches: 80 }]),
      ),
    },
  },
}));
