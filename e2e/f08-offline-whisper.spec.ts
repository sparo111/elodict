import { chromium, expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { editor, watchErrors } from "./helpers";

const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const big = (page: Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();
const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();

async function chooseOffline(page: Page, model: "tiny" | "base" = "tiny") {
  await openSettings(page);
  await page.getByLabel(/Offline nel browser, con Whisper/).check();
  await page.getByLabel("Modello offline").selectOption(model);
  await page.keyboard.press("Escape");
}

test.describe("Riconoscimento offline: impostazioni (senza scaricare il modello)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("OFF-H1 si può scegliere offline e la scelta resta dopo il ricaricamento", async ({ page }) => {
    await chooseOffline(page);
    await page.waitForTimeout(400);
    await page.reload();
    await openSettings(page);
    await expect(page.getByLabel(/Offline nel browser, con Whisper/)).toBeChecked();
    await expect(page.getByLabel("Modello offline")).toHaveValue("tiny");
  });

  test("OFF-H2 sotto la barra si legge che l'audio resta sul dispositivo", async ({ page }) => {
    await chooseOffline(page);
    // solo nel corpo della pagina: la stessa frase c'è anche nella nota di «Privato preciso», dentro la finestra delle impostazioni (che, sotto carico, può essere ancora nella pagina un istante dopo la chiusura)
    await expect(page.locator("main").getByText(/l'audio non lascia il tuo dispositivo/)).toBeVisible();
  });

  test("OFF-H3 stato del modello: non ancora scaricato", async ({ page }) => {
    await openSettings(page);
    await expect(page.getByText(/non è ancora stato scaricato/)).toBeVisible();
  });

  test("OFF-H4 il tasto 'Elimina i modelli scaricati' funziona anche se non c'è niente", async ({ page }) => {
    const check = watchErrors(page);
    await openSettings(page);
    await page.getByRole("button", { name: "Elimina i modelli scaricati" }).click();
    await expect(page.getByText("Modelli eliminati.")).toBeVisible();
    check();
  });

  test("OFF-N1 download fallito (rete assente): messaggio chiaro", async ({ page }) => {
    await page.route("**/huggingface.co/**", (r) => r.abort());
    await openSettings(page);
    await page.getByLabel("Modello offline").selectOption("tiny");
    await page.getByRole("button", { name: "Scarica il modello" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Non sono riuscito a scaricare il modello" })).toBeVisible({ timeout: 60_000 });
  });

  test("OFF-N2 senza rete, avviare la dettatura offline mostra l'errore del modello e si ferma", async ({ page }) => {
    await page.route("**/huggingface.co/**", (r) => r.abort());
    await chooseOffline(page);
    await big(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "modello offline non ha funzionato" })).toBeVisible({ timeout: 60_000 });
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });
});

test.describe("Riconoscimento offline su un browser senza riconoscimento integrato (come Firefox)", () => {
  test("OFF-F1 con 'offline' non compare l'avviso di browser non supportato", async ({ page }) => {
    await page.addInitScript(`delete window.SpeechRecognition; delete window.webkitSpeechRecognition;`);
    await page.goto("/");
    await expect(page.getByRole("alert").filter({ hasText: "non può ascoltarti" })).toBeVisible();
    await expect(big(page)).toBeDisabled();
    await chooseOffline(page);
    await expect(page.getByRole("alert").filter({ hasText: "non può ascoltarti" })).toHaveCount(0);
    await expect(big(page)).toBeEnabled();
  });

  test("OFF-F2 se il browser non può nemmeno l'offline lo dice e blocca la scelta", async ({ page }) => {
    await page.addInitScript(`delete window.AudioWorkletNode;`);
    await page.goto("/");
    await openSettings(page);
    await expect(page.getByLabel(/Offline nel browser, con Whisper/)).toBeDisabled();
    await expect(page.getByRole("dialog")).toContainText("non può eseguire il riconoscimento offline");
  });
});

// ---- La prova vera: audio di sintesi -> microfono finto di Chrome -> Whisper nel browser -> testo ----
async function hfReachable(): Promise<boolean> {
  try {
    const r = await fetch("https://huggingface.co/Xenova/whisper-tiny/resolve/main/config.json", { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15_000) });
    return r.ok;
  } catch {
    return false;
  }
}

for (const [lang, file, first, second, model] of [
  ["en", "speech-en.wav", /hello/i, /test|offline|dictation/i, "tiny"],
  ["it", "speech-it.wav", /ciao/i, /prova|dettatura|ditatura/i, "tiny"],
  ["it", "speech-it.wav", /ciao/i, /prova|dettatura/i, "base"],
] as const) {
  test.describe(`Whisper vero (${lang}, modello ${model})`, () => {
    test(`WHISPER-${lang.toUpperCase()}-${model} trascrive la voce di sintesi`, async ({}, info) => {
      test.skip(info.project.name === "mobile", "una volta basta, sul desktop");
      test.skip(!fs.existsSync(path.join(FIX, file)), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
      test.skip(!(await hfReachable()), "il sito dei modelli non è raggiungibile");
      test.setTimeout(300_000);

      // Un browser a parte, che usa il file audio come se fosse il microfono.
      const browser = await chromium.launch({
        args: [
          "--use-fake-device-for-media-stream",
          "--use-fake-ui-for-media-stream",
          `--use-file-for-fake-audio-capture=${path.join(FIX, file)}`,
        ],
      });
      const context = await browser.newContext({
        baseURL: info.project.use.baseURL,
        locale: "it-IT",
        permissions: ["microphone"],
      });
      const page = await context.newPage();
      try {
        const check = watchErrors(page);
        await page.goto("/");
        if (lang !== "it") await page.getByRole("toolbar").getByRole("combobox").first().selectOption(lang);
        await chooseOffline(page, model);

        await big(page).click();
        await expect(page.getByText(/Carico il modello|Avvio del microfono|Ti ascolto/)).toBeVisible({ timeout: 30_000 });
        await expect(page.getByText("Ti ascolto…")).toBeVisible({ timeout: 180_000 });

        // la registrazione ha due frasi separate da una pausa: devono arrivare tutte e due
        await expect(editor(page)).toHaveText(first, { timeout: 120_000 });
        await expect(editor(page)).toHaveText(second, { timeout: 120_000 });
        const text = await editor(page).innerText();
        console.log(`[${lang}/${model}] trascritto: «${text.split("\n").join(" ")}»`);

        await big(page).click();
        await expect(big(page)).toHaveAccessibleName(/Detta/, { timeout: 60_000 });
        check();
      } finally {
        await context.close();
        await browser.close();
      }
    });
  });
}
