import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { editor, NO_PICKER, say, watchErrors } from "./helpers";

const openExport = (page: Page) => page.getByRole("button", { name: "Esporta" }).click();

test.describe("Esportazione (scaricamento normale)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(NO_PICKER);
    await page.goto("/");
  });

  test("EXP-H1 scarica tutti i formati con il nome scelto", async ({ page }) => {
    const check = watchErrors(page);
    await say(page, "ciao mondo punto");
    for (const [label, ext] of [["Word", "docx"], ["PDF", "pdf"], ["Markdown", "md"], ["Testo semplice", "txt"], ["Pagina web", "html"]]) {
      await openExport(page);
      await page.getByLabel("Nome del file").fill("Il mio testo");
      const [dl] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", { name: new RegExp(label) }).click(),
      ]);
      expect(dl.suggestedFilename()).toBe(`Il mio testo.${ext}`);
      const bytes = fs.readFileSync((await dl.path())!);
      if (ext === "docx") expect(bytes.subarray(0, 2).toString()).toBe("PK");
      if (ext === "pdf") expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      if (ext === "txt") expect(bytes.toString()).toContain("Ciao mondo.");
      await expect(page.getByText("File salvato.")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    check();
  });

  test("EXP-H2 il nome proposto è il titolo del documento", async ({ page }) => {
    await say(page, "riunione di lunedì punto");
    await openExport(page);
    await expect(page.getByLabel("Nome del file")).toHaveValue("Riunione di lunedì");
  });

  test("EXP-E1 documento vuoto: nessun file, messaggio chiaro", async ({ page }) => {
    await openExport(page);
    await page.getByRole("button", { name: /Testo semplice/ }).click();
    await expect(page.getByText("Non c'è ancora niente da scaricare.")).toBeVisible();
  });

  test("EXP-E2 caratteri vietati nel nome vengono tolti", async ({ page }) => {
    await say(page, "ciao");
    await openExport(page);
    await page.getByLabel("Nome del file").fill('a/b:c?"d');
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Markdown/ }).click()]);
    expect(dl.suggestedFilename()).toBe("abcd.md");
  });

  test("EXP-E3 nome vuoto: usa un nome di riserva", async ({ page }) => {
    await say(page, "ciao");
    await openExport(page);
    await page.getByLabel("Nome del file").fill("   ");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Markdown/ }).click()]);
    expect(dl.suggestedFilename()).toBe("documento.md");
  });

  test("EXP-E4 accenti ed emoji nel markdown", async ({ page }) => {
    await say(page, "è già così 😀");
    await openExport(page);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Markdown/ }).click()]);
    expect(fs.readFileSync((await dl.path())!, "utf8")).toContain("È già così 😀");
  });

  test("EXP-E5 il grassetto fatto con la barra arriva nel markdown", async ({ page }) => {
    await editor(page).click();
    await page.keyboard.type("importante");
    await page.keyboard.press("Control+A");
    await page.getByRole("button", { name: "Grassetto" }).click();
    await openExport(page);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Markdown/ }).click()]);
    expect(fs.readFileSync((await dl.path())!, "utf8")).toContain("**importante**");
  });
});

test.describe("Esportazione con 'Salva con nome' (Chrome/Edge)", () => {
  test("EXP-P1 propone il nome e scrive il file scelto", async ({ page }) => {
    await page.addInitScript(`
      window.showSaveFilePicker = async (o) => { window.__opts = o;
        return { createWritable: async () => ({ write: async (b) => { window.__saved = { size: b.size, type: b.type }; }, close: async () => {} }) }; };
    `);
    await page.goto("/");
    await say(page, "ciao mondo");
    await openExport(page);
    await page.getByLabel("Nome del file").fill("Lettera");
    await page.getByRole("button", { name: /PDF/ }).click();
    await expect(page.getByText("File salvato.")).toBeVisible();
    expect(await page.evaluate(() => (window as any).__opts.suggestedName)).toBe("Lettera.pdf");
    const saved = await page.evaluate(() => (window as any).__saved);
    expect(saved.type).toBe("application/pdf");
    expect(saved.size).toBeGreaterThan(100);
  });

  test("EXP-P2 se annulli la finestra non succede niente", async ({ page }) => {
    await page.addInitScript(`window.showSaveFilePicker = async () => { const e = new Error("x"); e.name = "AbortError"; throw e; };`);
    await page.goto("/");
    await say(page, "ciao");
    await openExport(page);
    await page.getByRole("button", { name: /Word/ }).click();
    await expect(page.getByText("File salvato.")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("Invia per email", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });
  const openSend = (page: Page) => page.getByRole("button", { name: "Invia" }).click();

  test("MAIL-E1 documento vuoto: nessun pulsante, messaggio", async ({ page }) => {
    await openSend(page);
    await expect(page.getByRole("dialog")).toContainText("Non c'è ancora niente");
    await expect(page.getByRole("button", { name: /Apri la posta/ })).toHaveCount(0);
  });

  test("MAIL-H1 testo corto: la posta si può aprire e l'oggetto è il titolo", async ({ page }) => {
    await say(page, "saluti punto");
    await openSend(page);
    await expect(page.getByRole("button", { name: /Apri la posta/ })).toBeEnabled();
    await expect(page.getByLabel("Oggetto")).toHaveAttribute("placeholder", "Saluti");
  });

  test("MAIL-E2 testo troppo lungo per il link: pulsante spento e spiegazione", async ({ page }) => {
    await say(page, "parola ".repeat(600));
    await openSend(page);
    await expect(page.getByRole("button", { name: /Apri la posta/ })).toBeDisabled();
    await expect(page.getByRole("dialog")).toContainText("troppo lungo");
  });

  test("MAIL-E3 senza 'Condividi' del sistema, l'app lo spiega", async ({ page }) => {
    await page.addInitScript(`Object.defineProperty(navigator, "canShare", { value: undefined });`);
    await page.goto("/");
    await say(page, "ciao");
    await openSend(page);
    await expect(page.getByRole("dialog")).toContainText("non permette di condividere file");
  });
});
