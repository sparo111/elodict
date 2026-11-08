import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { editor, FAKE_SPEECH, say, watchErrors } from "./helpers";

const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();
const big = (page: Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();
const toolbarLang = (page: Page) => page.getByRole("toolbar").getByRole("combobox");

async function downloadBackup(page: Page): Promise<string> {
  await openSettings(page);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Scarica la copia di sicurezza" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^mia-dictate-copia-\d{4}-\d{2}-\d{2}\.json$/);
  return (await dl.path())!;
}

test.describe("Copia di sicurezza", () => {
  test("BACKUP-H1 scarico la copia e contiene il mio testo", async ({ page }) => {
    const check = watchErrors(page);
    await page.goto("/");
    await say(page, "da non perdere punto");
    const path = await downloadBackup(page);
    const data = JSON.parse(fs.readFileSync(path, "utf8"));
    expect(data.app).toBe("mia-dictate");
    expect(data.documents).toHaveLength(1);
    expect(JSON.stringify(data.documents[0].content)).toContain("Da non perdere.");
    check();
  });

  test("BACKUP-H2 ripristino dopo aver cambiato il testo", async ({ page }) => {
    await page.goto("/");
    await say(page, "testo originale punto");
    await page.keyboard.press("Escape");
    const path = await downloadBackup(page);
    await page.keyboard.press("Escape");

    await editor(page).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("testo sbagliato");
    await expect(page.getByText("Salvato su questo dispositivo")).toBeVisible();
    await page.waitForTimeout(900);

    await openSettings(page);
    await page.getByLabel("Ripristina da file").setInputFiles(path);
    await expect(page.getByRole("dialog")).toContainText("Ripristinati 1 documenti.");
    await page.keyboard.press("Escape");
    await expect(editor(page)).toHaveText("Testo originale.");
  });

  test("BACKUP-H3 ripristino in un browser nuovo e vuoto (documento, lingua e dizionario)", async ({ page, browser }) => {
    await page.goto("/");
    await openSettings(page);
    await page.getByLabel("Come lo sente").fill("pippo");
    await page.getByLabel("Come lo vuoi").fill("Pippo");
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await page.keyboard.press("Escape");
    await say(page, "ciao pippo punto");
    await page.waitForTimeout(900);
    const path = await downloadBackup(page);

    const ctx = await browser.newContext({ locale: "it-IT" });
    const fresh = await ctx.newPage();
    await fresh.goto(page.url());
    await expect(editor(fresh)).toHaveText("");
    await fresh.getByRole("button", { name: "Impostazioni" }).click();
    await fresh.getByLabel("Ripristina da file").setInputFiles(path);
    await expect(fresh.getByRole("dialog")).toContainText("Ripristinati 1 documenti.");
    await expect(fresh.getByRole("dialog").locator("li")).toContainText("Pippo");
    await fresh.keyboard.press("Escape");
    await expect(editor(fresh)).toHaveText("Ciao Pippo.");
    await ctx.close();
  });

  test("BACKUP-N1 un file sbagliato dà un errore e non cambia niente", async ({ page }) => {
    await page.goto("/");
    await say(page, "resta cosi");
    await page.waitForTimeout(900);
    await openSettings(page);
    await page.getByLabel("Ripristina da file").setInputFiles({
      name: "x.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ app: "altro", version: 1, documents: [] })),
    });
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("non è una copia di sicurezza valida");
    await page.keyboard.press("Escape");
    await expect(editor(page)).toHaveText("Resta cosi");
  });

  test("BACKUP-E1 la scritta che ricorda di fare la copia è visibile", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/ogni tanto scarica una copia di sicurezza/)).toBeVisible();
  });
});

test.describe("Cambio lingua al volo", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.goto("/");
  });

  test("LANG-H1 dal selettore nella barra", async ({ page }) => {
    await expect(toolbarLang(page)).toHaveValue("it");
    await toolbarLang(page).selectOption("en");
    await say(page, "hello comma world");
    await expect(editor(page)).toHaveText("Hello, world");
  });

  test("LANG-H2 la scelta resta dopo il ricaricamento", async ({ page }) => {
    await toolbarLang(page).selectOption("es");
    await page.waitForTimeout(300);
    await page.reload();
    await expect(toolbarLang(page)).toHaveValue("es");
  });

  test("LANG-H3 a voce: 'passa all'inglese' e poi 'switch to italian'", async ({ page }) => {
    await say(page, "passa all'inglese");
    await expect(toolbarLang(page)).toHaveValue("en");
    await say(page, "hello comma world");
    await expect(editor(page)).toHaveText("Hello, world");
    await say(page, "switch to italian");
    await expect(toolbarLang(page)).toHaveValue("it");
    await say(page, "ciao virgola mondo");
    await expect(editor(page)).toHaveText("Hello, world ciao, mondo");
  });

  test("LANG-H4 mentre ascolta: il microfono riparte nella nuova lingua", async ({ page }) => {
    await big(page).click();
    await expect.poll(() => page.evaluate(() => (window as any).__recLang)).toBe("it-IT");
    await page.evaluate(() => (window as any).__say("passa all'inglese"));
    await expect.poll(() => page.evaluate(() => (window as any).__recLang)).toBe("en-US");
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
    await page.evaluate(() => (window as any).__say("hello comma world"));
    await expect(editor(page)).toHaveText("Hello, world");
  });

  test("LANG-H5 dal selettore mentre ascolta: continua ad ascoltare", async ({ page }) => {
    await big(page).click();
    await toolbarLang(page).selectOption("fr");
    await expect.poll(() => page.evaluate(() => (window as any).__recLang)).toBe("fr-FR");
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
  });

  test("LANG-E1 se non stava ascoltando, il cambio non accende il microfono", async ({ page }) => {
    await toolbarLang(page).selectOption("fr");
    await page.waitForTimeout(300);
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });

  test("LANG-E2 l'aiuto elenca i comandi per cambiare lingua", async ({ page }) => {
    await page.getByRole("button", { name: "Aiuto" }).click();
    await expect(page.getByRole("dialog")).toContainText("«passa all'inglese»");
  });
});

test.describe("Prova del microfono", () => {
  test("MIC-H1 con un microfono la barra si muove e si vede quale è", async ({ page }) => {
    const check = watchErrors(page);
    await page.goto("/");
    await openSettings(page);
    await page.getByRole("button", { name: "Prova il microfono" }).first().click();
    await expect(page.getByText(/Microfono in uso:/)).toBeVisible();
    await expect.poll(async () => Number(await page.getByRole("meter").getAttribute("aria-valuenow")), { timeout: 10000 }).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Ferma la prova" }).click();
    await expect(page.getByRole("meter")).toHaveAttribute("aria-valuenow", "0");
    check();
  });

  test("MIC-N1 microfono bloccato: messaggio chiaro", async ({ page }) => {
    await page.addInitScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("no", "NotAllowedError"));`);
    await page.goto("/");
    await openSettings(page);
    await page.getByRole("button", { name: "Prova il microfono" }).first().click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Il microfono è bloccato");
  });

  test("MIC-N2 nessun microfono: messaggio chiaro", async ({ page }) => {
    await page.addInitScript(`navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("no", "NotFoundError"));`);
    await page.goto("/");
    await openSettings(page);
    await page.getByRole("button", { name: "Prova il microfono" }).first().click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Non trovo nessun microfono");
  });

  test("MIC-E1 chiudendo la finestra il microfono si spegne", async ({ page }) => {
    await page.addInitScript(`
      window.__stopped = 0;
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); s.getTracks().forEach(t => { const st = t.stop.bind(t); t.stop = () => { window.__stopped++; st(); }; }); return s; };
    `);
    await page.goto("/");
    await openSettings(page);
    await page.getByRole("button", { name: "Prova il microfono" }).first().click();
    await expect(page.getByText(/Microfono in uso:/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect.poll(() => page.evaluate(() => (window as any).__stopped)).toBeGreaterThan(0);
  });
});

test.describe("Avviso quando non arriva testo", () => {
  test("NOTEXT-H1 dopo 10 secondi senza testo compare l'avviso, e sparisce quando arriva testo", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.clock.install();
    await page.goto("/");
    await big(page).click();
    await expect(page.getByText("Ti ascolto…")).toBeVisible();
    await expect(page.getByText(/non arriva testo/)).toHaveCount(0);
    await page.clock.fastForward(11000);
    await expect(page.getByText(/non arriva testo/)).toBeVisible();
    await page.evaluate(() => (window as any).__say("ciao"));
    await expect(page.getByText(/non arriva testo/)).toHaveCount(0);
  });

  test("NOTEXT-H2 l'avviso porta alla prova del microfono", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.clock.install();
    await page.goto("/");
    await big(page).click();
    await page.clock.fastForward(11000);
    await page.getByRole("status").filter({ hasText: "non arriva testo" }).getByRole("button", { name: "Prova il microfono" }).click();
    await expect(page.getByRole("dialog")).toContainText("Prova del microfono");
  });

  test("NOTEXT-E1 in pausa non dà l'avviso", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.clock.install();
    await page.goto("/");
    await big(page).click();
    await page.evaluate(() => (window as any).__say("pausa dettatura"));
    await page.clock.fastForward(15000);
    await expect(page.getByText(/non arriva testo/)).toHaveCount(0);
  });

  test("NOTEXT-E2 'non ti sento' offre la prova del microfono", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.goto("/");
    await big(page).click();
    await page.evaluate(() => (window as any).__fail("no-speech"));
    await page.getByRole("alert").getByRole("button", { name: "Prova il microfono" }).click();
    await expect(page.getByRole("dialog")).toContainText("Prova del microfono");
  });
});
