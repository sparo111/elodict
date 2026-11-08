import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { editor, FAKE_SPEECH, NO_PICKER, say, watchErrors } from "./helpers";

const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();

async function addEntry(page: Page, from: string, to: string) {
  await openSettings(page);
  await page.getByLabel("Come lo sente").fill(from);
  await page.getByLabel("Come lo vuoi").fill(to);
  await page.getByRole("button", { name: "Aggiungi" }).click();
  await page.keyboard.press("Escape");
}

test.describe("Pulizia del testo", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("CLEAN-H1 toglie i suoni di esitazione (acceso di default)", async ({ page }) => {
    await say(page, "ehm ciao uhm mondo");
    await expect(editor(page)).toHaveText("Ciao mondo");
  });

  test("CLEAN-H2 si può spegnere", async ({ page }) => {
    await openSettings(page);
    await page.getByLabel(/Togli i suoni di esitazione/).uncheck();
    await page.keyboard.press("Escape");
    await say(page, "ehm ciao");
    await expect(editor(page)).toHaveText("Ehm ciao");
  });

  test("CLEAN-H3 le parole ripetute: spento di default, acceso le toglie", async ({ page }) => {
    await say(page, "che che bello");
    await expect(editor(page)).toHaveText("Che che bello");
    await openSettings(page);
    await page.getByLabel(/Togli le parole ripetute/).check();
    await page.keyboard.press("Escape");
    await say(page, "davvero davvero bello");
    await expect(editor(page)).toHaveText("Che che bello davvero bello");
  });

  test("CLEAN-E1 i comandi funzionano anche con le esitazioni in mezzo", async ({ page }) => {
    await say(page, "ciao ehm virgola uhm come stai punto interrogativo");
    await expect(editor(page)).toHaveText("Ciao, come stai?");
  });

  test("CLEAN-E2 la scelta resta dopo il ricaricamento", async ({ page }) => {
    await openSettings(page);
    await page.getByLabel(/Togli i suoni di esitazione/).uncheck();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.reload();
    await say(page, "ehm ciao");
    await expect(editor(page)).toHaveText("Ehm ciao");
  });

  test("CLEAN-E3 in inglese toglie 'um' e 'uh'", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("dialog").getByRole("combobox").first().selectOption("en");
    await page.keyboard.press("Escape");
    await say(page, "um hello uh world");
    await expect(editor(page)).toHaveText("Hello world");
  });
});

test.describe("Dizionario personale", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("DICT-H1 aggiungo una voce e viene usata", async ({ page }) => {
    const check = watchErrors(page);
    await addEntry(page, "pippo rossi", "Pippo Rossi");
    await say(page, "ha scritto pippo rossi punto");
    await expect(editor(page)).toHaveText("Ha scritto Pippo Rossi.");
    check();
  });

  test("DICT-H2 la voce resta dopo il ricaricamento", async ({ page }) => {
    await addEntry(page, "whisper", "Whisper");
    await page.waitForTimeout(300);
    await page.reload();
    await say(page, "uso whisper");
    await expect(editor(page)).toHaveText("Uso Whisper");
  });

  test("DICT-H3 posso rimuovere una voce", async ({ page }) => {
    await addEntry(page, "ciao", "Salve");
    await openSettings(page);
    await page.getByRole("button", { name: /Rimuovi: ciao/ }).click();
    await expect(page.getByText("Ancora nessuna voce.")).toBeVisible();
    await page.keyboard.press("Escape");
    await say(page, "ciao");
    await expect(editor(page)).toHaveText("Ciao");
  });

  test("DICT-E1 voci vuote non vengono aggiunte", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Ancora nessuna voce.")).toBeVisible();
  });

  test("DICT-E2 la stessa parola due volte sostituisce la voce vecchia", async ({ page }) => {
    await addEntry(page, "mario", "Mario");
    await addEntry(page, "MARIO", "Marione");
    await openSettings(page);
    await expect(page.getByRole("dialog").locator("li")).toHaveCount(1);
    await expect(page.getByRole("dialog").locator("li")).toContainText("Marione");
  });

  test("DICT-E3 il dizionario non tocca i comandi vocali", async ({ page }) => {
    await addEntry(page, "virgola", "VIRGOLA");
    await say(page, "ciao virgola mondo");
    await expect(editor(page)).toHaveText("Ciao, mondo");
  });

  test("DICT-E4 esporta e importa", async ({ page }) => {
    await page.addInitScript(NO_PICKER);
    await page.goto("/");
    await addEntry(page, "uno", "1");
    await openSettings(page);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Esporta dizionario" }).click()]);
    expect(dl.suggestedFilename()).toBe("dizionario.json");
    expect(JSON.parse(fs.readFileSync((await dl.path())!, "utf8"))).toEqual([{ from: "uno", to: "1" }]);

    await page.getByLabel("Importa dizionario").setInputFiles({
      name: "d.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify([{ from: "due", to: "2" }])),
    });
    await expect(page.getByRole("dialog").locator("li")).toHaveCount(2);
  });

  test("DICT-N1 un file sbagliato mostra un errore e non cambia nulla", async ({ page }) => {
    await openSettings(page);
    await page.getByLabel("Importa dizionario").setInputFiles({
      name: "x.json",
      mimeType: "application/json",
      buffer: Buffer.from("questo non è json"),
    });
    await expect(page.getByRole("alert")).toContainText("non è un dizionario valido");
    await expect(page.getByText("Ancora nessuna voce.")).toBeVisible();
  });
});

test.describe("Pausa e scorciatoie", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.goto("/");
  });
  const big = (page: Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();

  test("PAUSE-H1 pausa a voce: il testo detto in pausa viene ignorato, poi riprende", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__say("ciao"));
    await page.evaluate(() => (window as any).__say("pausa dettatura"));
    await expect(page.getByText(/In pausa/)).toBeVisible();
    await page.evaluate(() => (window as any).__say("questo non va scritto"));
    await expect(editor(page)).toHaveText("Ciao");
    await page.evaluate(() => (window as any).__say("riprendi dettatura"));
    await expect(page.getByText(/In pausa/)).toHaveCount(0);
    await page.evaluate(() => (window as any).__say("mondo"));
    await expect(editor(page)).toHaveText("Ciao mondo");
  });

  test("PAUSE-H2 il pulsante Riprendi funziona", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__say("pausa dettatura"));
    await page.getByRole("button", { name: "Riprendi" }).click();
    await page.evaluate(() => (window as any).__say("scritto"));
    await expect(editor(page)).toHaveText("Scritto");
  });

  test("PAUSE-H3 'ferma dettatura' a voce ferma l'ascolto", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__say("ferma dettatura"));
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });

  test("PAUSE-E1 se ferma l'ascolto mentre è in pausa, la pausa si azzera", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__say("pausa dettatura"));
    await big(page).click();
    await expect(page.getByText(/In pausa/)).toHaveCount(0);
    await big(page).click();
    await page.evaluate(() => (window as any).__say("ciao"));
    await expect(editor(page)).toHaveText("Ciao");
  });

  test("KEY-H1 Alt+Maiusc+D avvia e ferma", async ({ page }) => {
    await page.keyboard.press("Alt+Shift+KeyD");
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
    await page.keyboard.press("Alt+Shift+KeyD");
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });

  test("KEY-H2 Esc ferma l'ascolto", async ({ page }) => {
    await big(page).click();
    await page.keyboard.press("Escape");
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });

  test("KEY-E1 Esc dentro una finestra chiude la finestra ma non ferma l'ascolto", async ({ page }) => {
    await big(page).click();
    await page.getByRole("button", { name: "Aiuto" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
  });

  test("KEY-H3 l'aiuto elenca le scorciatoie e i comandi di pausa", async ({ page }) => {
    await page.getByRole("button", { name: "Aiuto" }).click();
    const d = page.getByRole("dialog");
    await expect(d).toContainText("Alt+Maiusc+D");
    await expect(d).toContainText("«pausa dettatura»");
  });
});
