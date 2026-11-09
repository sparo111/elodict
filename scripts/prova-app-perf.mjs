// Misura i tempi della catena di Whisper dentro l'APP (build di prova, riquadro ?perf=1) con un microfono finto che ripete le 5 frasi registrate.
//   node scripts/prova-app-perf.mjs --url http://localhost:5241/ --browser chromium|msedge --silence 700 --threads 1 --device wasm \
//        --audio prova-parakeet/public/audio/frasi-di-fila.wav --expect 5 --out prova-parakeet/risultati/app-chromium-s700-t1.json
// Il microfono finto è quello di Chromium/Edge (--use-file-for-fake-audio-capture). Una cartella di profilo per browser tiene il modello già scaricato.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const url = arg("url");
const browserName = arg("browser", "chromium");
const silence = Number(arg("silence", 700));
const threads = Number(arg("threads", 1));
const device = arg("device", "wasm");
const audio = path.resolve(arg("audio", "prova-parakeet/public/audio/frasi-di-fila.wav"));
const expect = Number(arg("expect", 5));
const out = arg("out", `prova-parakeet/risultati/app-${browserName}-s${silence}-t${threads}.json`);
const wait = Number(arg("wait", 150)) * 1000;
if (!url) throw new Error("serve --url");

const profile = path.join(os.tmpdir(), `prova-app-profilo-${browserName}`);
fs.mkdirSync(profile, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

const ctx = await chromium.launchPersistentContext(profile, {
  channel: browserName === "msedge" ? "msedge" : undefined,
  headless: true,
  locale: "it-IT",
  permissions: ["microphone"],
  viewport: { width: 1280, height: 900 },
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${audio}`, ...(device === "webgpu" ? ["--enable-unsafe-webgpu", "--enable-features=Vulkan,WebGPU", "--ignore-gpu-blocklist"] : [])],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const log = [];
page.on("console", (m) => m.type() === "error" && log.push(`console.error: ${m.text().slice(0, 300)}`));
page.on("pageerror", (e) => log.push(`pageerror: ${e.message.slice(0, 300)}`));
await page.addInitScript(() => {
  try {
    localStorage.setItem("elodict-onboarding", "done");
    localStorage.setItem("elodict-install-banner", "dismissed");
  } catch {
    /* niente */
  }
});

const result = { url, browser: browserName, silenceMs: silence, threads, device, expect, startedAt: new Date().toISOString(), rows: [], log };
try {
  const q = `?perf=1&silence=${silence}&threads=${threads}&device=${device}`;
  await page.goto(`${url}${q}`);
  // il service worker (e con lui l'isolamento nella build «coi») prende il controllo alla visita dopo
  await page.evaluate(async () => {
    await navigator.serviceWorker?.ready;
  });
  await page.reload();
  await page.waitForTimeout(800);
  result.isolated = await page.evaluate(() => self.crossOriginIsolated);
  result.controlled = await page.evaluate(() => !!navigator.serviceWorker?.controller);
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByLabel(/Offline nel browser, con Whisper/).check();
  await page.getByLabel("Modello offline").selectOption("base");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Detta/ }).last().click({ timeout: 120_000 });
  await page.getByText("Ti ascolto…").waitFor({ timeout: 240_000 });
  result.listeningAt = Date.now();
  const t0 = Date.now();
  while (Date.now() - t0 < wait) {
    const n = await page.evaluate(() => (window.__perfRows ?? []).length);
    if (n >= expect) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);
  result.rows = await page.evaluate(() => window.__perfRows ?? []);
  result.editor = await page.getByRole("textbox", { name: "Documento" }).innerText();
} catch (e) {
  result.fatal = `${e.name}: ${e.message}`.slice(0, 500);
  console.error("FATALE", result.fatal);
  await page.screenshot({ path: out.replace(/\.json$/, "-errore.png") }).catch(() => undefined);
}
fs.writeFileSync(out, JSON.stringify(result, null, 1));
await Promise.race([ctx.close().catch(() => undefined), new Promise((r) => setTimeout(r, 60_000))]);
console.log(`salvato ${out}: ${result.rows.length} frasi, isolata=${result.isolated}, controllata=${result.controlled}`);
process.exit(0);
