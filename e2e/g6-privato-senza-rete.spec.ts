import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T013e: «Privato» (Whisper) e «Privato preciso» (Parakeet) funzionano SENZA RETE, dopo il primo scaricamento?
 * Si parte da un profilo vuoto, come chi apre l'app per la prima volta: si sceglie il modo, si aspetta il download,
 * si detta con audio finto; poi si spegne la rete, si ricarica la pagina e si detta ancora. Se non compare il testo
 * la prova fallisce e scrive quali file sono falliti senza rete.
 *   npx playwright test --project=dettatura-produzione g6-
 *   SITE_URL=https://sparo111.github.io/elodict/ npx playwright test --project=sito-pubblicato g6-
 * Scarica Whisper piccolo (~40 MB) e/o Parakeet (~200 MB) una volta per browser (profilo in una cartella temporanea).
 * Due modi di arrivarci: «prima visita» (si sceglie subito, il programma offline non controlla ancora la pagina) e «già controllata»
 * (si ricarica prima di scegliere, così il programma offline controlla la pagina). Per ciascuno si prova anche senza rete.
 * G6_BROWSER=chromium,msedge per provare anche Edge; G6_ENGINE=whisper|parakeet per provarne uno solo; G6_WHISPER_MODEL=base per il modello medio.
 */
const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const WAV = path.join(FIX, "speech-it.wav");
const WANT = (process.env.G6_BROWSER ?? "chromium").split(",");
const WHISPER_MODEL = process.env.G6_WHISPER_MODEL ?? "tiny";

function siteFor(info: { project: { name: string; use: { baseURL?: string } } }): string {
  const raw = process.env.SITE_URL || (info.project.name === "dettatura-produzione" ? (info.project.use.baseURL ?? "") : "");
  return raw ? raw.replace(/\/?$/, "/") : "";
}

const big = (page: Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();
const editor = (page: Page) => page.getByRole("textbox", { name: "Documento" });
const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();

const ENGINES = [
  {
    key: "whisper",
    nome: "«Privato» (Whisper)",
    scegli: async (page: Page) => {
      await openSettings(page);
      await page.getByRole("radio", { name: /Offline nel browser, con Whisper/ }).check();
      await page.getByLabel("Modello offline").selectOption(WHISPER_MODEL);
      await page.keyboard.press("Escape");
    },
  },
  {
    key: "parakeet",
    nome: "«Privato preciso» (Parakeet)",
    scegli: async (page: Page) => {
      await openSettings(page);
      await page.getByRole("radio", { name: /Privato preciso, con Parakeet/ }).check();
      await page.keyboard.press("Escape");
    },
  },
].filter((e) => !process.env.G6_ENGINE || process.env.G6_ENGINE === e.key);

/** Detta («Ciao a tutti. Questa è una prova della dettatura.»), aspetta il testo, poi Ferma. */
async function dictate(page: Page, tag: string): Promise<string> {
  await editor(page).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await big(page).click();
  await expect(page.getByText("Ti ascolto…"), `${tag}: deve arrivare a «Ti ascolto…»`).toBeVisible({ timeout: 300_000 });
  await expect(editor(page), `${tag}: testo`).toHaveText(/ciao/i, { timeout: 60_000 });
  await expect(editor(page), `${tag}: testo`).toHaveText(/prova|dettatura|ditatura|vettatura|temperatura/i, { timeout: 60_000 });
  const text = (await editor(page).innerText()).split("\n").join(" ").trim();
  await big(page).click();
  await expect(big(page)).toHaveAccessibleName(/Detta/, { timeout: 60_000 });
  return text;
}

/** Cosa ha la pagina in memoria: programma offline attivo e che controlla la pagina, memorie, file del motore salvati. */
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const names = await caches.keys();
    const motore = names.includes("elodict-motore") ? (await (await caches.open("elodict-motore")).keys()).map((r) => new URL(r.url).pathname) : [];
    return { swAttivo: !!reg?.active, swControllaLaPagina: !!navigator.serviceWorker.controller, memorie: names, fileDelMotoreSalvati: motore };
  });
}

const VISITE = [
  { key: "prima", nome: "alla prima visita (la pagina non è ancora controllata dal programma offline)" },
  { key: "controllata", nome: "dopo un ricaricamento (la pagina è già controllata dal programma offline)" },
].filter((v) => !process.env.G6_VISITA || process.env.G6_VISITA === v.key);

for (const which of WANT) {
  for (const eng of ENGINES) {
   for (const visita of VISITE) {
    test.describe.serial(`${eng.nome} senza rete, in ${which}, ${visita.nome}`, () => {
      let ctx: BrowserContext;
      let page: Page;
      let SITE = "";
      const profile = path.join(os.tmpdir(), `g6-profilo-${which}-${eng.key}-${visita.key}`);
      /** Le richieste fatte mentre la rete è spenta, con l'esito. */
      const offlineLog: { url: string; esito: string }[] = [];
      let logging = false;
      /** I file del motore (ort/, ort31/) chiesti mentre la rete c'è. */
      const motoreOnline = new Set<string>();

      test.beforeAll(async ({}, info) => {
        SITE = siteFor(info);
        if (!SITE || !fs.existsSync(WAV)) return;
        fs.rmSync(profile, { recursive: true, force: true }); // sempre da zero: è la prima visita
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
          } catch {
            /* niente memoria locale: non importa per la prova */
          }
        });
        // tutte le richieste, anche quelle dei lavoratori e del service worker
        ctx.on("request", (r) => {
          const u = new URL(r.url());
          if (!logging && /\/ort(31)?\//.test(u.pathname)) motoreOnline.add(u.pathname);
        });
        ctx.on("requestfailed", (r) => {
          if (!logging) return;
          const chi = r.serviceWorker() ? "fatta dal programma offline" : "fatta dalla pagina o da un lavoratore";
          offlineLog.push({ url: r.url(), esito: `FALLITA (${r.failure()?.errorText}; ${r.method()} ${r.resourceType()}, ${chi})` });
        });
        ctx.on("response", (r) => {
          if (!logging) return;
          const da = r.fromServiceWorker() ? "dal programma offline" : "dalla rete";
          if (r.status() >= 400 || !r.fromServiceWorker()) offlineLog.push({ url: r.url(), esito: `HTTP ${r.status()} ${da}` });
        });
        page = ctx.pages()[0] ?? (await ctx.newPage());
      });
      test.afterAll(async () => {
        await Promise.race([ctx?.close().catch(() => undefined), new Promise((r) => setTimeout(r, 60_000))]);
      });
      test.beforeEach(({}, info) => {
        test.skip(!SITE, "serve il progetto «dettatura-produzione», oppure SITE_URL");
        test.skip(!fs.existsSync(WAV), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
        info.setTimeout(600_000);
      });

      test("1. prima visita, con la rete: si sceglie, si aspetta il download e si detta", async () => {
        await page.goto(SITE); // prima visita
        if (visita.key === "controllata") {
          await page.evaluate(async () => {
            await navigator.serviceWorker.ready;
          });
          await page.reload();
          await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30_000 }).toBe(true);
        } // altrimenti: nessun ricaricamento prima di scegliere (come chi segue il primo avvio)
        await eng.scegli(page);
        const text = await dictate(page, `${eng.key}/con rete`);
        console.log(`[${which}/${eng.key}/${visita.key}] CON RETE: «${text}»`);
        const s = await snapshot(page);
        console.log(`[${which}/${eng.key}/${visita.key}] STATO DOPO IL PRIMO USO: ${JSON.stringify(s)}`);
        console.log(`[${which}/${eng.key}/${visita.key}] FILE DEL MOTORE CHIESTI CON LA RETE: ${JSON.stringify([...motoreOnline].sort())}`);
        test.info().annotations.push({ type: "stato dopo il primo uso", description: JSON.stringify(s) });
      });

      test("2. senza rete: si ricarica la pagina e si detta ancora", async () => {
        // il programma offline deve essere attivo (alla prima visita ci mette qualche secondo): è quello che, spenta la rete, riapre l'app
        await expect.poll(async () => (await snapshot(page)).swAttivo, { timeout: 60_000 }).toBe(true);
        await ctx.setOffline(true);
        offlineLog.length = 0;
        logging = true;
        let ok = false;
        let errore = "";
        try {
          await page.reload();
          await expect(editor(page)).toBeVisible({ timeout: 30_000 });
          const text = await dictate(page, `${eng.key}/senza rete`);
          console.log(`[${which}/${eng.key}/${visita.key}] SENZA RETE: «${text}»`);
          ok = true;
        } catch (e) {
          errore = e instanceof Error ? e.message.split("\n")[0] : String(e);
        } finally {
          logging = false;
          await ctx.setOffline(false).catch(() => undefined);
        }
        const falliti = offlineLog.filter((r) => /FALLITA|HTTP [45]/.test(r.esito));
        const tabella = falliti.map((r) => `   ${r.esito}  ${r.url.replace(/^https?:\/\/[^/]+/, "")}`).join("\n");
        console.log(`[${which}/${eng.key}/${visita.key}] RISULTATO SENZA RETE: ${ok ? "RIUSCITA" : "FALLITA — " + errore}`);
        console.log(`[${which}/${eng.key}/${visita.key}] RICHIESTE FALLITE SENZA RETE (${falliti.length}):\n${tabella || "   (nessuna)"}`);
        test.info().annotations.push({ type: "richieste fallite senza rete", description: falliti.map((r) => `${r.esito} ${r.url}`).join(" | ") || "nessuna" });
        expect(ok, `senza rete la dettatura non è partita (${errore}); richieste fallite:\n${tabella}`).toBe(true);
      });
    });
   }
  }
}

/**
 * Prima di caricare il modello la pagina mette al sicuro i file del motore (qualche secondo, se la rete è lenta). Se in quel momento l'utente
 * cambia idea e passa a «Il browser», non deve partire nessun lavoratore né nessun download del modello (un solo modello in memoria, e solo se voluto).
 */
test("3. cambio di idea durante l'attesa: nessun modello caricato né scaricato", async ({}, info) => {
  const SITE = siteFor(info);
  test.skip(!SITE, "serve il progetto «dettatura-produzione», oppure SITE_URL");
  test.skip(!fs.existsSync(WAV), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
  info.setTimeout(120_000);
  const profile = path.join(os.tmpdir(), "g6-profilo-cambio");
  fs.rmSync(profile, { recursive: true, force: true });
  const ctx = await chromium.launchPersistentContext(profile, {
    locale: "it-IT",
    permissions: ["microphone"],
    viewport: { width: 1280, height: 900 },
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  try {
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("elodict-onboarding", "done");
        localStorage.setItem("elodict-install-banner", "dismissed");
      } catch {
        /* niente memoria locale: non importa per la prova */
      }
    });
    const asked: string[] = [];
    ctx.on("request", (r) => asked.push(r.url()));
    // il file grande del motore arriva lentamente (6 secondi)
    await ctx.route(/ort-wasm-simd-threaded\.jsep\.wasm$/, async (route) => {
      await new Promise((r) => setTimeout(r, 6000));
      await route.continue();
    });
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.goto(SITE);
    await openSettings(page);
    await page.getByRole("radio", { name: /Offline nel browser, con Whisper/ }).check();
    await page.getByLabel("Modello offline").selectOption("tiny");
    await page.getByRole("button", { name: "Scarica il modello" }).click();
    await expect(page.getByText(/Scarico il modello/)).toBeVisible({ timeout: 10_000 });
    await page.getByRole("radio", { name: /^Il browser/ }).check(); // cambio di idea, subito
    // si prova che qualcosa NON succede: si aspetta più dei 6 secondi di ritardo del file del motore
    await page.waitForTimeout(10_000);
    expect(page.workers().filter((w) => /whisper\.worker|app\.worker/.test(w.url())).map((w) => w.url())).toEqual([]);
    expect(asked.filter((u) => /huggingface\.co/.test(u))).toEqual([]);
  } finally {
    await ctx.close().catch(() => undefined);
  }
});
