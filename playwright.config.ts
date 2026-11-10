import { defineConfig, devices } from "@playwright/test";

const DEV = "http://localhost:5199"; // sviluppo (prove di sempre)
const PWA = "http://localhost:5200"; // versione costruita, indirizzo radice
const BASE = "http://localhost:5201"; // versione costruita, sotto /elodict/
const PROD = "http://localhost:5230"; // build di PRODUZIONE (vite build, senza agganci per le prove), sotto /elodict/ come su GitHub Pages

/** Primo avvio già fatto e avviso «installa» già chiuso: così le prove di sempre non vedono schermate nuove. */
const done = (origin: string) => ({
  cookies: [],
  origins: [
    {
      origin,
      localStorage: [
        { name: "elodict-onboarding", value: "done" },
        { name: "elodict-install-banner", value: "dismissed" },
      ],
    },
  ],
});

const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };
const mobile = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: DEV,
    trace: "retain-on-failure",
    locale: "it-IT",
    // Un finto microfono (emette un segnale di prova) per poter provare la barra di livello.
    permissions: ["microphone"],
    launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] },
  },
  webServer: [
    {
      command: "node scripts/copy-ort.mjs && npx vite --port 5199 --strictPort",
      url: DEV,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      // versione costruita per davvero (qui il «service worker» c'è; in sviluppo no)
      command: "npm run build:pwa-test && npx vite preview --outDir dist-pwa --port 5200 --strictPort",
      url: PWA,
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: "npm run build:base-test && npx vite preview --outDir dist-base --port 5201 --strictPort",
      url: `${BASE}/elodict/`,
      reuseExistingServer: true,
      timeout: 240_000,
      env: { VITE_BASE: "/elodict/" },
    },
    {
      // La build che va online (npm run build: modalità production) con la stessa base del sito pubblicato.
      command: "npm run build -- --outDir dist-prod && npx vite preview --outDir dist-prod --port 5230 --strictPort",
      url: `${PROD}/elodict/`,
      reuseExistingServer: true,
      timeout: 360_000,
      env: { VITE_BASE: "/elodict/" },
    },
  ],
  projects: [
    { name: "desktop", testIgnore: /(pwa-|f16-|f19-webkit-|g[1256]-).*\.spec\.ts/, use: { ...desktop, storageState: done(DEV) } },
    { name: "mobile", testIgnore: /(pwa-|f16-|f19-webkit-|g[1256]-).*\.spec\.ts/, use: { ...mobile, storageState: done(DEV) } },
    // Migrazione con la versione di prima e un profilo vero (apre i suoi server e il suo browser): npm run test:migrazione
    // Parte per ultima e da sola (avvia altri server e un altro browser): se girasse insieme alle altre le rallenterebbe.
    { name: "migrazione-vera", testMatch: /f16-.*\.spec\.ts/, dependencies: ["desktop", "mobile", "pwa-desktop", "pwa-mobile"], use: { ...desktop } },
    // Prove sul sito pubblicato (o sulla sua anteprima): si lanciano a mano con SITE_URL=... npx playwright test --project=sito-pubblicato
    { name: "sito-pubblicato", testMatch: /g[1256]-.*\.spec\.ts/, use: { ...desktop } },
    // T013z: la dettatura deve scrivere testo sulla build di produzione sotto /elodict/ (microfono finto, Edge/Chromium): npm run test:dettatura
    { name: "dettatura-produzione", testMatch: /g[256]-.*\.spec\.ts/, use: { ...desktop, baseURL: `${PROD}/elodict/` } },
    // T013d: i due riconoscitori con WebKit, sulla copia di prova costruita (porta 5200)
    { name: "app-webkit", testMatch: /f19-webkit-.*\.spec\.ts/, use: { ...devices["Desktop Safari"], baseURL: PWA, locale: "it-IT" } },
    // Prove della versione installabile: partono "da zero" (nessun primo avvio fatto) salvo dove il test lo imposta.
    { name: "pwa-desktop", testMatch: /pwa-.*\.spec\.ts/, testIgnore: /pwa-iphone/, use: { ...desktop, baseURL: PWA } },
    { name: "pwa-mobile", testMatch: /pwa-.*\.spec\.ts/, testIgnore: /pwa-iphone/, use: { ...mobile, baseURL: PWA } },
    // T001e: iPhone (motore WebKit di Safari, profilo iPhone 15). Serve: npx playwright install webkit
    { name: "pwa-iphone", testMatch: /pwa-iphone.*\.spec\.ts/, use: { ...devices["iPhone 15"], baseURL: PWA, locale: "it-IT" } },
  ],
});
