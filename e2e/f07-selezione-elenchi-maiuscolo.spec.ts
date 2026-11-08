import { expect, test, type Page } from "@playwright/test";
import { editor, say, watchErrors } from "./helpers";

const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Selezione a voce", () => {
  test("SEL-H1 seleziono l'ultima frase e la prossima frase detta la sostituisce", async ({ page }) => {
    await say(page, "va bene punto domani vengo punto");
    await say(page, "seleziona ultima frase");
    const sel = await page.evaluate(() => window.getSelection()?.toString());
    expect(sel).toBe("Domani vengo.");
    await say(page, "dopodomani");
    await expect(editor(page)).toHaveText("Va bene. Dopodomani");
  });

  test("SEL-H2 seleziono l'ultima parola", async ({ page }) => {
    await say(page, "uno due tre");
    await say(page, "seleziona ultima parola");
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("tre");
  });

  test("SEL-H3 seleziono tutto e poi tolgo la selezione", async ({ page }) => {
    await say(page, "uno due tre");
    await say(page, "seleziona tutto");
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("Uno due tre");
    await say(page, "deseleziona");
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  });

  test("SEL-E1 su documento vuoto non rompe nulla", async ({ page }) => {
    const check = watchErrors(page);
    await say(page, "seleziona ultima parola");
    await say(page, "seleziona tutto");
    await say(page, "deseleziona");
    await expect(editor(page)).toHaveText("");
    check();
  });
});

test.describe("Maiuscolo e minuscolo", () => {
  test("CAPS-H1 maiuscolo ultima parola", async ({ page }) => {
    await say(page, "questo è importante");
    await say(page, "maiuscolo ultima parola");
    await expect(editor(page)).toHaveText("Questo è IMPORTANTE");
  });

  test("CAPS-H2 minuscolo ultima frase", async ({ page }) => {
    await say(page, "ATTENZIONE QUI");
    await say(page, "minuscolo ultima frase");
    await expect(editor(page)).toHaveText("attenzione qui");
  });

  test("CAPS-H3 il grassetto resta quando cambio le maiuscole", async ({ page }) => {
    await say(page, "ciao mondo");
    await say(page, "grassetto ultima parola");
    await say(page, "maiuscolo ultima parola");
    await expect(editor(page).locator("strong")).toHaveText("MONDO");
  });

  test("CAPS-H4 in inglese: uppercase last word", async ({ page }) => {
    await page.getByRole("toolbar").getByRole("combobox").first().selectOption("en");
    await say(page, "see you tomorrow");
    await say(page, "uppercase last word");
    await expect(editor(page)).toHaveText("See you TOMORROW");
  });
});

test.describe("Elenchi a voce", () => {
  test("LIST-H1 elenco puntato con più voci", async ({ page }) => {
    await say(page, "elenco puntato");
    await say(page, "latte");
    await say(page, "voce successiva");
    await say(page, "pane");
    await expect(editor(page).locator("ul li")).toHaveCount(2);
    await expect(editor(page).locator("ul li").nth(1)).toHaveText("Pane");
  });

  test("LIST-H2 elenco numerato e uscita", async ({ page }) => {
    await say(page, "elenco numerato");
    await say(page, "primo");
    await say(page, "voce successiva");
    await say(page, "esci dall'elenco");
    await say(page, "fine");
    await expect(editor(page).locator("ol li")).toHaveCount(1);
    await expect(editor(page).locator("ol li")).toHaveText("Primo");
    await expect(editor(page).locator(":scope > p")).toHaveText("Fine");
  });

  test("LIST-H3 le voci arrivano nell'esportazione in Markdown", async ({ page }) => {
    await say(page, "elenco puntato");
    await say(page, "uno");
    await say(page, "voce successiva");
    await say(page, "due");
    const html = await editor(page).innerHTML();
    expect(html).toContain("<ul>");
  });
});

test.describe("Mostra comandi e punto automatico", () => {
  test("HELP-H1 'mostra comandi' apre l'elenco", async ({ page }) => {
    await say(page, "mostra comandi");
    await expect(page.getByRole("dialog")).toContainText("Comandi vocali");
  });

  test("HELP-H2 l'elenco mostra anche selezione ed elenchi", async ({ page }) => {
    await page.getByRole("button", { name: "Aiuto" }).click();
    const d = page.getByRole("dialog");
    await expect(d).toContainText("«seleziona tutto»");
    await expect(d).toContainText("«elenco puntato»");
    await expect(d).toContainText("«maiuscolo ultima parola»");
  });

  test("PERIOD-H1 spento di default: nessun punto aggiunto", async ({ page }) => {
    await say(page, "ciao a tutti");
    await expect(editor(page)).toHaveText("Ciao a tutti");
  });

  test("PERIOD-H2 acceso: aggiunge il punto e la frase dopo parte con la maiuscola", async ({ page }) => {
    await openSettings(page);
    await page.getByLabel(/Aggiungi il punto dopo ogni pausa/).check();
    await page.keyboard.press("Escape");
    await say(page, "ciao a tutti");
    await say(page, "come state");
    await expect(editor(page)).toHaveText("Ciao a tutti. Come state.");
  });

  test("PERIOD-E1 non aggiunge un secondo segno se la frase finisce già con uno", async ({ page }) => {
    await openSettings(page);
    await page.getByLabel(/Aggiungi il punto dopo ogni pausa/).check();
    await page.keyboard.press("Escape");
    await say(page, "come stai punto interrogativo");
    await expect(editor(page)).toHaveText("Come stai?");
  });

  test("PERIOD-E2 la scelta resta dopo il ricaricamento", async ({ page }) => {
    await openSettings(page);
    await page.getByLabel(/Aggiungi il punto dopo ogni pausa/).check();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.reload();
    await openSettings(page);
    await expect(page.getByLabel(/Aggiungi il punto dopo ogni pausa/)).toBeChecked();
  });
});
