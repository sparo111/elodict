import { expect, test } from "@playwright/test";
import { editor, say, setLanguage, watchErrors } from "./helpers";

// F02 Correggere a voce, e comandi nelle 4 lingue (frasi scritte nella casella di prova)
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("F02-H1 punteggiatura e maiuscole in italiano", async ({ page }) => {
  const check = watchErrors(page);
  await say(page, "ciao virgola come stai punto interrogativo");
  await expect(editor(page)).toHaveText("Ciao, come stai?");
  check();
});

test("F02-H2 cancella parola e annulla", async ({ page }) => {
  await say(page, "ciao bel mondo");
  await say(page, "cancella parola");
  await expect(editor(page)).toHaveText("Ciao bel");
  await say(page, "annulla");
  await expect(editor(page)).toHaveText("Ciao bel mondo");
});

test("F02-H3 cancella frase", async ({ page }) => {
  await say(page, "va bene punto domani vengo punto");
  await say(page, "cancella frase");
  await expect(editor(page)).toHaveText("Va bene.");
});

test("F02-H4 a capo e nuovo paragrafo creano righe diverse", async ({ page }) => {
  await say(page, "uno a capo due nuovo paragrafo tre");
  await expect(editor(page).locator("p")).toHaveCount(2);
  await expect(editor(page).locator("br")).toHaveCount(1);
});

test("F02-H5 inglese", async ({ page }) => {
  await setLanguage(page, "dictation", "en");
  await say(page, "hello comma how are you question mark");
  await expect(editor(page)).toHaveText("Hello, how are you?");
});

test("F02-H6 francese: spazio prima del punto interrogativo", async ({ page }) => {
  await setLanguage(page, "dictation", "fr");
  await say(page, "bonjour virgule ça va point d'interrogation");
  await expect(editor(page)).toHaveText("Bonjour, ça va ?");
});

test("F02-H7 spagnolo: ¿ e ?", async ({ page }) => {
  await setLanguage(page, "dictation", "es");
  await say(page, "signo de apertura de interrogación cómo estás signo de interrogación");
  await expect(editor(page)).toHaveText("¿Cómo estás?");
});

test("F02-H8 la lingua scelta resta dopo aver ricaricato la pagina", async ({ page }) => {
  await setLanguage(page, "dictation", "en");
  await page.waitForTimeout(300);
  await page.reload();
  await say(page, "hello comma world");
  await expect(editor(page)).toHaveText("Hello, world");
});

test("F02-E1 accenti ed emoji restano intatti", async ({ page }) => {
  await say(page, "è già così 😀 perché");
  await expect(editor(page)).toHaveText("È già così 😀 perché");
});

test("F02-E2 frase vuota o solo spazi non fa niente", async ({ page }) => {
  await say(page, "   ");
  await expect(editor(page)).toHaveText("");
});

test("F02-E3 testo lunghissimo non blocca l'app", async ({ page }) => {
  const long = "parola ".repeat(3000);
  await say(page, long);
  await expect(editor(page)).toContainText("Parola parola");
  await expect(page.getByRole("button", { name: "Detta" }).last()).toBeEnabled();
});

test("F02-E4 invio doppio rapido non rompe nulla", async ({ page }) => {
  const check = watchErrors(page);
  await say(page, "uno");
  await page.locator("#try").fill("due");
  await page.locator("#try").press("Enter");
  await page.locator("#try").press("Enter");
  await expect(editor(page)).toHaveText("Uno due");
  check();
});

test("F02-E5 cancella parola su documento vuoto non fa danni", async ({ page }) => {
  const check = watchErrors(page);
  await say(page, "cancella parola");
  await say(page, "annulla");
  await expect(editor(page)).toHaveText("");
  check();
});

test("F02-E6 il cursore a metà testo: la dettatura si inserisce lì", async ({ page }) => {
  await say(page, "inizio fine");
  await editor(page).click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await say(page, "mezzo");
  await expect(editor(page)).toContainText("mezzo");
});
