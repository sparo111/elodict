import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T013d: «Privato preciso» (Parakeet) nell'app, sulla build di PRODUZIONE con base /elodict/ (o sul sito pubblicato), con Chromium ed Edge veri
 * e microfono finto (pulito e rumoroso):
 *   npx playwright test --project=dettatura-produzione g5-
 *   SITE_URL=https://sparo111.github.io/elodict/ npx playwright test --project=sito-pubblicato g5-
 * Scarica Whisper piccolo (~40 MB) e Parakeet (~200 MB) una volta per browser (profilo tenuto in una cartella temporanea).
 */
const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const WAV = path.join(FIX, "speech-it.wav");
const WANT = (process.env.G5_BROWSER ?? "chromium,msedge").split(",");

function siteFor(info: { project: { name: string; use: { baseURL?: string } } }): string {
  const raw = process.env.SITE_URL || (info.project.name === "dettatura-produzione" ? (info.project.use.baseURL ?? "") : "");
  return raw ? raw.replace(/\/?$/, "/") : "";
}

const big = (page: Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();
const editor = (page: Page) => page.getByRole("textbox", { name: "Documento" });
const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();
const radioParakeet = (page: Page) => page.getByRole("radio", { name: /Privato preciso, con Parakeet/ });
const radioWhisper = (page: Page) => page.getByRole("radio", { name: /Offline nel browser, con Whisper/ });
const radioBrowser = (page: Page) => page.getByRole("radio", { name: /^Il browser/ });
const cleanEditor = async (page: Page) => {
  await editor(page).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
};
const workerUrls = (page: Page) => page.workers().map((w) => w.url());
/** Quello che la pagina ha scritto di sbagliato (console, errori), da stampare se una dettatura non produce testo. */
const LOG: string[] = [];
function watch(page: Page, tag: string) {
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && LOG.push(`[${tag}] console.${m.type()}: ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => LOG.push(`[${tag}] pageerror: ${e.message.slice(0, 300)}`));
  page.on("requestfailed", (r) => LOG.push(`[${tag}] richiesta fallita ${r.url().slice(0, 140)} ${r.failure()?.errorText}`));
  page.on("worker", (w) => LOG.push(`[${tag}] lavoratore avviato ${w.url().slice(-60)}`));
}

/** Microfono finto della Web Audio: la voce del file più un fondo costante (RMS 0,03), che il microfono finto di Chromium toglierebbe. */
async function noisyMic(page: Page, file = WAV, noise = 0.03) {
  const b64 = fs.readFileSync(file).toString("base64");
  await page.addInitScript(([data, noiseRms]: [string, number]) => {
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
  }, [b64, noise] as [string, number]);
}

/** Detta, aspetta il testo della registrazione («Ciao a tutti. Questa è una prova della dettatura.»), poi Ferma. */
async function dictate(page: Page, tag: string) {
  await cleanEditor(page);
  await big(page).click();
  try {
    await expect(page.getByText("Ti ascolto…")).toBeVisible({ timeout: 300_000 });
    await expect(editor(page), `${tag}: testo`).toHaveText(/ciao/i, { timeout: 60_000 });
    await expect(editor(page), `${tag}: testo`).toHaveText(/prova|dettatura|ditatura|vettatura|temperatura/i, { timeout: 60_000 });
  } catch (e) {
    console.log(`[${tag}] DETTATURA FALLITA. Stato: ${JSON.stringify(await page.getByRole("status").allInnerTexts().catch(() => []))}; avvisi: ${JSON.stringify(await page.getByRole("alert").allInnerTexts().catch(() => []))}; lavoratori: ${JSON.stringify(workerUrls(page).map((u) => u.slice(-40)))}${String.fromCharCode(10)}${LOG.slice(-25).join(String.fromCharCode(10))}`);
    throw e;
  }
  const text = (await editor(page).innerText()).split("\n").join(" ").trim();
  await big(page).click();
  await expect(big(page)).toHaveAccessibleName(/Detta/, { timeout: 60_000 });
  return text;
}

for (const which of WANT) {
  test.describe.serial(`«Privato preciso» in ${which}`, () => {
    let ctx: BrowserContext;
    let page: Page;
    let SITE = "";
    const profile = path.join(os.tmpdir(), `g5-profilo-${which}`);

    test.beforeAll(async ({}, info) => {
      SITE = siteFor(info);
      if (!SITE || !fs.existsSync(WAV)) return;
      if (!process.env.G5_KEEP) fs.rmSync(profile, { recursive: true, force: true }); // di solito da zero: si prova anche il primo scaricamento (G5_KEEP=1 tiene i modelli già scaricati)
      ctx = await chromium.launchPersistentContext(profile, {
        channel: which === "msedge" ? "msedge" : undefined,
        locale: "it-IT",
        permissions: ["microphone"],
        viewport: { width: 1280, height: 900 },
        args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${WAV}`],
      });
      await ctx.addInitScript(() => {
        try {
          localStorage.setItem("elodict-onboarding", "done");
          localStorage.setItem("elodict-install-banner", "dismissed");
        } catch { /* niente */ }
      });
      page = ctx.pages()[0] ?? (await ctx.newPage());
      watch(page, "principale");
    });
    test.afterAll(async () => {
      await Promise.race([ctx?.close().catch(() => undefined), new Promise((r) => setTimeout(r, 60_000))]);
    });
    test.beforeEach(({}, info) => {
      test.skip(!SITE, "serve il progetto «dettatura-produzione», oppure SITE_URL");
      test.skip(!fs.existsSync(WAV), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
      info.setTimeout(600_000);
    });

    test("1. in Impostazioni c'è «Privato preciso» (con la riga che lo spiega), le scelte di prima restano, e il browser resta il punto di partenza", async () => {
      await page.goto(SITE);
      await openSettings(page);
      if (!process.env.G5_KEEP) await expect(radioBrowser(page)).toBeChecked(); // chi non ha scelto niente: il browser, come prima
      await expect(radioWhisper(page)).toBeVisible();
      await expect(radioParakeet(page)).toBeVisible();
      await expect(page.getByText("Più preciso del Privato con Whisper. Circa 200 MB da scaricare una volta. Funziona senza internet")).toBeVisible();
      // i crediti CC-BY-4.0 compaiono (Parakeet è disponibile)
      const credits = page.getByRole("region", { name: /Riconoscimento vocale Parakeet: crediti e licenza/ });
      await expect(credits).toBeVisible();
      for (const n of ["NVIDIA", "istupakov", "Olicorne", "moondream", "CC-BY-4.0"]) await expect(credits).toContainText(n);
      await page.keyboard.press("Escape");
    });

    test("2. si sceglie «Privato preciso», si vede l'avanzamento del download, e il modello risulta pronto", async () => {
      await openSettings(page);
      await radioParakeet(page).check();
      if (process.env.G5_KEEP) {
        // con i modelli già scaricati (G5_KEEP=1, solo per rifare le prove più in fretta) non c'è niente da scaricare
        await expect(page.getByText("Il modello è pronto su questo dispositivo.")).toBeVisible();
        await page.keyboard.press("Escape");
        return;
      }
      await expect(page.getByText(/non è ancora stato scaricato/)).toBeVisible();
      await page.getByRole("button", { name: "Scarica il modello" }).click();
      // avanzamento: compare la barra e la percentuale cresce
      await expect(page.getByText(/Scarico il modello… \d+%/)).toBeVisible({ timeout: 60_000 });
      const seen = new Set<number>();
      const t0 = Date.now();
      while (Date.now() - t0 < 300_000 && !(await page.getByText("Il modello è pronto su questo dispositivo.").isVisible())) {
        const m = (await page.getByText(/Scarico il modello… \d+%/).first().textContent({ timeout: 2000 }).catch(() => ""))?.match(/(\d+)%/);
        if (m) seen.add(Number(m[1]));
        await page.waitForTimeout(500);
      }
      await expect(page.getByText("Il modello è pronto su questo dispositivo.")).toBeVisible({ timeout: 30_000 });
      expect(seen.size, `percentuali viste: ${[...seen].join(",")}`).toBeGreaterThan(1);
      await page.keyboard.press("Escape");
    });

    test("3. dettatura con microfono pulito: scrive il testo e mette il punto finale", async () => {
      const text = await dictate(page, `${which}/pulito`);
      console.log(`[${which}/Parakeet pulito] «${text}»`);
      expect(text).toMatch(/\.$/); // la frase finisce con il punto
    });

    test("3b. i comandi vocali («virgola», «punto», «a capo») funzionano come con Whisper: la punteggiatura e l'a capo sono scritti, non le parole dei comandi", async () => {
      const COM = path.join(FIX, "speech-comandi-it.wav");
      test.skip(!fs.existsSync(COM), "manca speech-comandi-it.wav: esegui e2e/make-fixtures.ps1");
      const p = await ctx.newPage();
      watch(p, "comandi");
      await noisyMic(p, COM, 0); // «Buongiorno virgola vorrei un caffè punto a capo grazie mille punto»
      await p.goto(SITE);
      await cleanEditor(p);
      await big(p).click();
      await expect(p.getByText("Ti ascolto…")).toBeVisible({ timeout: 300_000 });
      await expect(editor(p)).toContainText(/grazie mille/i, { timeout: 60_000 });
      const paragraphs = await editor(p).locator("p").allInnerTexts();
      console.log(`[${which}/Parakeet comandi] paragrafi: ${JSON.stringify(paragraphs)}`);
      const all = paragraphs.join(" ");
      expect(all).toMatch(/Buongiorno, vorrei un caff/i); // «virgola» → ","
      expect(all).not.toMatch(/virgola|a capo/i); // le parole dei comandi non restano nel testo
      expect(all).toMatch(/caff[eè]\.\s*\nGrazie mille\./); // «punto» → «.»; «a capo» → nuova riga
      await p.close();
    });

    test("4. dettatura con microfono RUMOROSO (fondo costante): scrive il testo", async () => {
      const noisy = await ctx.newPage();
      watch(noisy, "rumoroso");
      await noisyMic(noisy);
      await noisy.goto(SITE);
      const text = await dictate(noisy, `${which}/rumoroso`);
      console.log(`[${which}/Parakeet rumoroso] «${text}»`);
      await noisy.close();
    });

    test("5. passaggio Whisper ↔ Parakeet senza ricaricare la pagina: un solo modello in memoria alla volta", async () => {
      await page.goto(SITE);
      await cleanEditor(page);
      // dalla pagina appena aperta: Parakeet attivo → lavoratore di Parakeet dopo la prima dettatura
      expect((await dictate(page, "Parakeet 1")).length).toBeGreaterThan(5);
      expect(workerUrls(page).some((u) => u.includes("app.worker"))).toBe(true);
      expect(workerUrls(page).some((u) => u.includes("whisper.worker"))).toBe(false);
      // passa a Whisper (piccolo) SENZA ricaricare
      await openSettings(page);
      await radioWhisper(page).check();
      await page.getByLabel("Modello offline").selectOption("tiny");
      await page.keyboard.press("Escape");
      await expect.poll(() => workerUrls(page).some((u) => u.includes("app.worker")), { timeout: 15_000 }).toBe(false); // Parakeet chiuso
      expect((await dictate(page, "Whisper")).length).toBeGreaterThan(5);
      expect(workerUrls(page).some((u) => u.includes("whisper.worker"))).toBe(true);
      expect(workerUrls(page).some((u) => u.includes("app.worker"))).toBe(false);
      // e di nuovo a Parakeet, sempre senza ricaricare
      await openSettings(page);
      await radioParakeet(page).check();
      await page.keyboard.press("Escape");
      await expect.poll(() => workerUrls(page).some((u) => u.includes("whisper.worker")), { timeout: 15_000 }).toBe(false); // Whisper chiuso
      expect((await dictate(page, "Parakeet 2")).length).toBeGreaterThan(5);
      expect(workerUrls(page).some((u) => u.includes("app.worker"))).toBe(true);
      expect(workerUrls(page).some((u) => u.includes("whisper.worker"))).toBe(false);
      // e con «Il browser» nessuno dei due modelli resta in memoria
      await openSettings(page);
      await radioBrowser(page).check();
      await page.keyboard.press("Escape");
      await expect.poll(() => workerUrls(page).filter((u) => /app\.worker|whisper\.worker/.test(u)).length, { timeout: 15_000 }).toBe(0);
      await openSettings(page);
      await radioParakeet(page).check();
      await page.keyboard.press("Escape");
    });

    test("6. senza internet, dopo il primo scaricamento: si riapre l'app e si detta con Parakeet", async () => {
      await page.goto(SITE);
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload();
      await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30_000 }).toBe(true);
      await ctx.setOffline(true);
      try {
        await page.reload();
        await expect(editor(page)).toBeVisible({ timeout: 30_000 });
        const text = await dictate(page, "offline");
        console.log(`[${which}/Parakeet senza internet] «${text}»`);
      } finally {
        await ctx.setOffline(false);
      }
    });

    test("7. a 390 px la finestra delle impostazioni con «Privato preciso» non ha errori di accessibilità né scorrimento orizzontale", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(SITE);
      await openSettings(page);
      await expect(radioParakeet(page)).toBeChecked();
      expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const dlg = page.getByRole("dialog");
      expect(await dlg.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1280, height: 900 });
    });

    test("8. «Elimina i modelli scaricati» toglie anche Parakeet (memoria del browser e segno «pronto»)", async () => {
      await page.goto(SITE);
      expect((await page.evaluate(() => caches.keys())).some((k) => k === "elodict-parakeet")).toBe(true);
      await openSettings(page);
      await expect(page.getByText("Il modello è pronto su questo dispositivo.")).toBeVisible();
      await page.getByRole("button", { name: "Elimina i modelli scaricati" }).click();
      await expect(page.getByText("Modelli eliminati.")).toBeVisible({ timeout: 30_000 });
      const keys = await page.evaluate(() => caches.keys());
      expect(keys.filter((k) => /parakeet|transformers/i.test(k))).toEqual([]);
      expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("elodict-model-")))).toEqual([]);
      // dopo aver ricaricato, «Privato preciso» dice che il modello non c'è
      await page.reload();
      await openSettings(page);
      await expect(page.getByText(/non è ancora stato scaricato/)).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });
}
