import { chromium, expect, test, webkit, type Browser, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editor } from "./helpers";

/**
 * T013z: la dettatura DEVE scrivere testo sul sito pubblicato (o sulla build di produzione con base /elodict/), non solo in locale.
 * Un microfono finto riproduce una registrazione italiana; se nell'editor non compare testo la prova FALLISCE.
 *
 *   npx playwright test --project=dettatura-produzione        (costruisce la build di produzione con base /elodict/ e la prova)
 *   SITE_URL=https://sparo111.github.io/elodict/ npx playwright test --project=sito-pubblicato g2-    (il sito vero)
 *   G2_BROWSER=msedge,chromium,webkit (predefinito: msedge,chromium)    G2_MODEL=tiny|base (predefinito: tiny)
 *
 * Due microfoni finti:
 *  - «pulito»: il file audio come microfono di Chromium/Edge (--use-file-for-fake-audio-capture). Silenzio perfetto tra le frasi.
 *  - «rumoroso»: getUserMedia sostituito da un flusso della Web Audio con la stessa voce più un FONDO COSTANTE (RMS 0,03: come
 *    molti microfoni di computer e telefoni). Si usa questo perché il microfono finto di Chromium passa per la soppressione del
 *    rumore del browser, che il fondo lo toglie e nasconderebbe il guasto (il segmentatore non chiudeva mai la frase).
 * WebKit di Playwright (Windows) non ha né AudioContext né mediaDevices: lì la prova si salta e lo dice.
 */
const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const WAV = path.join(FIX, "speech-it.wav");
const MODEL = (process.env.G2_MODEL ?? "tiny") as "tiny" | "base";
const WANT = (process.env.G2_BROWSER ?? "msedge,chromium").split(",");

test.describe.configure({ mode: "serial" });

/** L'indirizzo da provare: SITE_URL, oppure quello della build di produzione avviata dal progetto «dettatura-produzione». */
function siteFor(info: { project: { name: string; use: { baseURL?: string } } }): string {
  const raw = process.env.SITE_URL || (info.project.name === "dettatura-produzione" ? (info.project.use.baseURL ?? "") : "");
  return raw ? raw.replace(/\/?$/, "/") : "";
}

const big = (page: Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();

/** Tutto quello che va storto, per capire il guasto: console, eccezioni, lavoratori, richieste. */
function record(page: Page, label: string) {
  const log: string[] = [];
  const add = (s: string) => log.push(`[${label}] ${s}`);
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && add(`console.${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => add(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => add(`RICHIESTA FALLITA ${r.url()} — ${r.failure()?.errorText}`));
  page.on("response", (r) => r.status() >= 400 && add(`HTTP ${r.status()} ${r.url()}`));
  page.on("worker", (w) => {
    add(`lavoratore avviato: ${w.url()}`);
    const wc = w as unknown as { on: (e: string, f: (m: { type(): string; text(): string }) => void) => void };
    try {
      wc.on("console", (m) => ["error", "warning"].includes(m.type()) && add(`worker.console.${m.type()}: ${m.text()}`));
    } catch { /* versioni senza questo evento */ }
  });
  return log;
}

/** getUserMedia finto: suona il file italiano in un flusso audio vero, con un fondo costante di rumore (RMS `noise`, 0 = nessuno). */
async function fakeMic(context: BrowserContext, noise: number) {
  const b64 = fs.readFileSync(WAV).toString("base64");
  await context.addInitScript(
    ({ data, noiseRms }: { data: string; noiseRms: number }) => {
      const gum = async () => {
        const bin = atob(data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const ctx = new AudioContext();
        await ctx.resume();
        const buf = await ctx.decodeAudioData(bytes.buffer);
        const dest = ctx.createMediaStreamDestination();
        const play = () => {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(dest);
          src.start();
          src.onended = () => setTimeout(play, 1500);
        };
        play();
        if (noiseRms > 0) {
          // 20 secondi di rumore bianco gaussiano, in ciclo, con l'RMS richiesto
          const n = ctx.sampleRate * 20;
          const nb = ctx.createBuffer(1, n, ctx.sampleRate);
          const d = nb.getChannelData(0);
          for (let i = 0; i < n; i++) d[i] = noiseRms * Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
          const ns = ctx.createBufferSource();
          ns.buffer = nb;
          ns.loop = true;
          ns.connect(dest);
          ns.start();
        }
        return dest.stream;
      };
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: { getUserMedia: gum, enumerateDevices: async () => [], addEventListener() {}, removeEventListener() {} },
      });
    },
    { data: b64, noiseRms: noise },
  );
}

async function launch(which: string): Promise<Browser | null> {
  const args = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${WAV}`];
  try {
    if (which === "msedge") return await chromium.launch({ channel: "msedge", args });
    if (which === "chromium") return await chromium.launch({ args });
    return await webkit.launch();
  } catch (e) {
    console.log(`[${which}] non disponibile: ${(e as Error).message.split("\n")[0]}`);
    return null;
  }
}

for (const which of WANT) {
  for (const mic of ["pulito", "rumoroso"] as const) {
    test(`G2-${which}-${mic}: «Privato» (Whisper ${MODEL}) scrive testo`, async ({}, info) => {
      test.setTimeout(420_000);
      const SITE = siteFor(info);
      test.skip(!SITE, "serve SITE_URL, oppure il progetto «dettatura-produzione»");
      test.skip(!fs.existsSync(WAV), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
      const browser = await launch(which);
      test.skip(!browser, `${which} non disponibile su questo computer`);
      const context = await browser!.newContext({ locale: "it-IT", permissions: which === "webkit" ? [] : ["microphone"], viewport: { width: 1280, height: 800 } });
      // «pulito» su Chromium/Edge: il file come microfono finto del browser; altrimenti il flusso della Web Audio
      if (which === "webkit" || mic === "rumoroso") await fakeMic(context, mic === "rumoroso" ? 0.03 : 0);
      await context.addInitScript(() => {
        try {
          localStorage.setItem("elodict-onboarding", "done");
          localStorage.setItem("elodict-install-banner", "dismissed");
        } catch { /* niente memoria */ }
      });
      const page = await context.newPage();
      const log = record(page, `${which}/${mic}`);
      try {
        await page.goto(SITE);
        const hasAudio = await page.evaluate(() => typeof AudioContext !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
        test.skip(!hasAudio, `${which} qui non ha la Web Audio / il microfono: non si può provare la dettatura`);
        await page.getByRole("button", { name: "Impostazioni" }).click();
        await page.getByLabel(/Offline nel browser, con Whisper/).check();
        await page.getByLabel("Modello offline").selectOption(MODEL);
        await page.keyboard.press("Escape");
        await big(page).click();
        await expect(page.getByText("Ti ascolto…")).toBeVisible({ timeout: 240_000 });
        // la registrazione dice «Ciao a tutti. Questa è una prova della dettatura»: se non compare, la prova FALLISCE
        // Il testo deve arrivare con la frase, non «ogni 20 secondi»: il guasto di T013z faceva uscire tutto solo al taglio dei 20 s.
        await expect(editor(page)).toHaveText(/ciao/i, { timeout: 15_000 });
        await expect(editor(page)).toHaveText(/prova|dettatura|ditatura|vettatura|distattura|temperatura|distattura/i, { timeout: 15_000 });
        console.log(`[${which}/${mic}] trascritto: «${(await editor(page).innerText()).split("\n").join(" ")}»`);
      } catch (e) {
        console.log(`[${which}/${mic}] ECCO COSA È ANDATO STORTO:\n${log.join("\n") || "(niente in console né in rete)"}`);
        console.log(`[${which}/${mic}] editor: «${await editor(page).innerText().catch(() => "?")}»; stato: ${JSON.stringify(await page.getByRole("status").allInnerTexts().catch(() => []))}`);
        throw e;
      } finally {
        await browser!.close();
      }
      // niente errori veri (gli avvisi non contano) durante tutta la dettatura
      expect(log.filter((l) => /RICHIESTA FALLITA|pageerror|console\.error|worker\.console\.error|HTTP 4|HTTP 5/.test(l)), "errori durante la dettatura").toEqual([]);
    });
  }
}
