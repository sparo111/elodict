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

test("F02-H9 cancella 2 parole (con cifra e a parole)", async ({ page }) => {
  await say(page, "uno due tre quattro cinque");
  await say(page, "cancella 2 parole");
  await expect(editor(page)).toHaveText("Uno due tre");
  await say(page, "cancella due parole");
  await expect(editor(page)).toHaveText("Uno");
});

test("F02-H10 cancella da X a Y", async ({ page }) => {
  await say(page, "ciao bel mondo felice");
  await say(page, "cancella da bel a mondo");
  await expect(editor(page)).toHaveText("Ciao felice");
});

test("F02-H11 cancella da X a Y che non esistono: non succede niente", async ({ page }) => {
  await say(page, "ciao mondo");
  await say(page, "cancella da pippo a pluto");
  await expect(editor(page)).toHaveText("Ciao mondo");
});

test("F02-H12 grassetto ultima parola, e la dettatura dopo NON è in grassetto", async ({ page }) => {
  await say(page, "questo è importante");
  await say(page, "grassetto ultima parola");
  await expect(editor(page).locator("strong")).toHaveText("importante");
  await say(page, "davvero");
  await expect(editor(page)).toHaveText("Questo è importante davvero");
  await expect(editor(page).locator("strong")).toHaveText("importante");
});

test("F02-H13 corsivo questo (ultimo testo detto) e rimuovi formattazione", async ({ page }) => {
  await say(page, "prima frase punto");
  await say(page, "seconda frase");
  await say(page, "corsivo questo");
  await expect(editor(page).locator("em")).toHaveText("Seconda frase");
  await say(page, "rimuovi formattazione ultima frase");
  await expect(editor(page).locator("em")).toHaveCount(0);
});

test("F02-H14 sottolineato in inglese e francese", async ({ page }) => {
  await setLanguage(page, "dictation", "en");
  await say(page, "see you tomorrow");
  await say(page, "underline last word");
  await expect(editor(page).locator("u")).toHaveText("tomorrow");
  await setLanguage(page, "dictation", "fr");
  await say(page, "à demain");
  await say(page, "gras dernier mot");
  await expect(editor(page).locator("strong")).toHaveText("demain");
});

test("F02-H15 simboli: euro, chiocciola, percentuale", async ({ page }) => {
  await say(page, "costa 5 simbolo di euro");
  await expect(editor(page)).toHaveText("Costa 5 €");
  await say(page, "sconto 20 segno di percentuale");
  await expect(editor(page)).toHaveText("Costa 5 € sconto 20%");
});

test("F02-E7 formattare con documento vuoto non rompe nulla", async ({ page }) => {
  const check = watchErrors(page);
  await say(page, "grassetto ultima parola");
  await say(page, "cancella 3 parole");
  await say(page, "cancella da a a b");
  await expect(editor(page)).toHaveText("");
  check();
});

test("F02-E8 aiuto: mostra anche gli esempi con numeri", async ({ page }) => {
  await page.getByRole("button", { name: "Aiuto" }).click();
  await expect(page.getByRole("dialog")).toContainText("cancella 3 parole");
  await expect(page.getByRole("dialog")).toContainText("grassetto");
});
