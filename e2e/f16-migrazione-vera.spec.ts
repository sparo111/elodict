import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { editor, say } from "./helpers";
import { readRawDatabase } from "./dbhelpers";
import { TAG_BEFORE_T004, prepareOldWorktree, removeWorktree, REPO, startVite, type RunningServer } from "./oldApp";

/**
 * Migrazione con un database VERO: la versione dell'app di prima (tag TAG_BEFORE_T004, in una cartella a parte)
 * crea un documento, un dizionario e la scelta del microfono in un profilo del browser; poi la versione attuale
 * si apre sullo STESSO profilo e deve ritrovare tutto identico.
 * Si lancia da solo con: npm run test:migrazione
 */
const PORT = 5210; // stesso indirizzo per le due versioni (altrimenti il browser userebbe due database diversi)
const URL = `http://localhost:${PORT}/`;

const launch = (profile: string): Promise<BrowserContext> =>
  chromium.launchPersistentContext(profile, {
    locale: "it-IT",
    viewport: { width: 1440, height: 900 },
    permissions: ["microphone"],
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });

async function settle(page: Page) {
  // il database è scritto davvero (non basta vedere il testo a schermo)
  await expect
    .poll(async () => {
      const raw = await readRawDatabase(page);
      const s = raw.settings[0] as { microphoneId?: string; dictionary?: unknown[]; engine?: string } | undefined;
      return raw.documents.length === 1 && !!s?.microphoneId && s.dictionary?.length === 2 && s.engine === "offline";
    })
    .toBe(true);
}

test("MIGV-1 un database creato dall'app di prima si apre con quella attuale e resta identico", async () => {
  test.setTimeout(300_000);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "elodict-profilo-"));
  const oldDir = prepareOldWorktree();
  let server: RunningServer | undefined;
  let context: BrowserContext | undefined;
  try {
    // ---------- 1) la versione di prima crea i dati ----------
    server = await startVite(oldDir, PORT);
    context = await launch(profile);
    let page = context.pages()[0] ?? (await context.newPage());
    await page.goto(URL);
    await expect(page.getByRole("dialog", { name: "Che lingua parli?" })).toBeVisible();
    await page.getByRole("button", { name: "Salta" }).click();
    await expect(page.getByRole("button", { name: "Documenti" })).toHaveCount(0); // è proprio la versione di prima

    await say(page, "lettera al condominio punto assemblea rinviata punto");
    await page.getByRole("button", { name: "Impostazioni" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Come lo sente").fill("elodic");
    await dlg.getByLabel("Come lo vuoi").fill("Elodict");
    await dlg.getByRole("button", { name: "Aggiungi" }).click();
    await dlg.getByLabel("Come lo sente").fill("mia");
    await dlg.getByLabel("Come lo vuoi").fill("Mimma");
    await dlg.getByRole("button", { name: "Aggiungi" }).click();
    await page.getByLabel(/Offline nel browser, con Whisper/).check();
    await page.getByLabel("Modello offline").selectOption("tiny");
    // il microfono: dopo il permesso compaiono i nomi; si sceglie l'ultimo dell'elenco (non il predefinito)
    await dlg.getByRole("button", { name: "Prova il microfono" }).click();
    await expect(dlg.getByText(/Microfono in uso:/)).toBeVisible();
    const select = dlg.getByLabel("Microfono", { exact: true });
    const values = await select.locator("option").evaluateAll((o) => (o as HTMLOptionElement[]).map((x) => x.value).filter(Boolean));
    expect(values.length, "il browser di prova deve avere almeno un microfono con identificativo").toBeGreaterThan(0);
    const chosen = values[values.length - 1];
    await select.selectOption(chosen);
    await settle(page);

    const before = await readRawDatabase(page);
    expect(before.version).toBe(10); // database della versione 1, scritto dall'app vera
    expect(before.documents).toHaveLength(1);
    expect((before.settings[0] as { microphoneId: string }).microphoneId).toBe(chosen);

    await context.close();
    context = undefined;
    await server.stop();
    server = undefined;

    // ---------- 2) la versione attuale si apre sullo stesso profilo ----------
    server = await startVite(REPO, PORT);
    context = await launch(profile);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(URL);
    await expect(editor(page)).toContainText("Lettera al condominio. Assemblea rinviata.");
    await expect(page.getByRole("button", { name: "Documenti" })).toBeVisible(); // è la versione attuale
    await expect(page.getByRole("dialog")).toHaveCount(0); // il primo avvio non ricompare

    const after = await readRawDatabase(page);
    expect(after.version).toBe(20);
    expect(after.settings).toEqual(before.settings); // impostazioni, dizionario e microfono: identici
    expect(after.documents).toEqual(before.documents.map((d) => ({ ...d, openedAt: d.updatedAt }))); // documento identico + ultima apertura

    // e l'app li usa davvero
    await page.getByRole("button", { name: "Impostazioni" }).click();
    const dlg2 = page.getByRole("dialog");
    await expect(dlg2).toContainText("Elodict");
    await expect(dlg2).toContainText("Mimma");
    await expect(page.getByLabel(/Offline nel browser, con Whisper/)).toBeChecked();
    await expect(page.getByLabel("Modello offline")).toHaveValue("tiny");
    await expect(dlg2.getByLabel("Microfono", { exact: true })).toHaveValue(chosen);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Documenti" }).click();
    await expect(page.getByRole("dialog", { name: "I tuoi documenti" }).getByRole("button", { name: /^Apri «Lettera al condominio/ })).toBeVisible();
  } finally {
    await context?.close().catch(() => undefined);
    await server?.stop();
    removeWorktree(oldDir);
    fs.rmSync(profile, { recursive: true, force: true });
  }
  console.log(`MIGV-1 verificata con la versione di prima (tag ${TAG_BEFORE_T004}) su un profilo vero`);
});
