import { expect, test } from "@playwright/test";
import { editor, FAKE_SPEECH, say, watchErrors } from "./helpers";

// F01 Dettare un testo (con un finto riconoscimento vocale al posto del microfono)
test.describe("F01 dettatura con tasto microfono", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.goto("/");
  });

  const big = (page: import("@playwright/test").Page) => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();

  test("F01-H1 percorso felice: Detta, parlo, il testo compare, Ferma", async ({ page }) => {
    const check = watchErrors(page);
    await big(page).click();
    await expect(page.getByText("Ti ascolto…")).toBeVisible();
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
    await page.evaluate(() => (window as any).__say("ciao virgola come stai punto interrogativo"));
    await expect(editor(page)).toHaveText("Ciao, come stai?");
    await big(page).click();
    await expect(big(page)).toHaveAccessibleName(/Detta/);
    check();
  });

  test("F01-H2 due frasi di fila si attaccano con lo spazio giusto", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__say("ciao"));
    await page.evaluate(() => (window as any).__say("come stai"));
    await expect(editor(page)).toHaveText("Ciao come stai");
  });

  test("F01-H3 il testo provvisorio si vede e poi sparisce", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__interim("sto parlan"));
    await expect(page.getByText("sto parlan")).toBeVisible();
    await page.evaluate(() => (window as any).__say("sto parlando"));
    await expect(page.getByText("sto parlan", { exact: true })).toHaveCount(0);
  });

  test("F01-E1 il browser ferma il microfono da solo: si riavvia", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__browserStop());
    await expect.poll(() => page.evaluate(() => (window as any).__starts)).toBe(2);
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
  });

  test("F01-E2 la lingua scelta arriva al riconoscimento (it-IT)", async ({ page }) => {
    await big(page).click();
    await expect.poll(() => page.evaluate(() => (window as any).__recLang)).toBe("it-IT");
  });

  test("F01-N1 microfono bloccato: messaggio chiaro e tasto torna a Detta", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__fail("not-allowed"));
    await expect(page.getByRole("alert")).toContainText("microfono è bloccato");
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });

  test("F01-N2 'non ti sento': avvisa ma continua ad ascoltare", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__fail("no-speech"));
    await expect(page.getByRole("alert")).toContainText("Non ti sento");
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
  });

  test("F01-N3 nessun microfono collegato", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__fail("audio-capture"));
    await expect(page.getByRole("alert")).toContainText("Non trovo nessun microfono");
  });

  test("F01-N4 Riprova dopo un errore riavvia l'ascolto", async ({ page }) => {
    await big(page).click();
    await page.evaluate(() => (window as any).__fail("not-allowed"));
    await page.getByRole("button", { name: "Riprova" }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(big(page)).toHaveAccessibleName(/Ferma/);
  });

  test("F01-E3 il tasto microfono nella barra fa lo stesso del tasto grande", async ({ page }) => {
    await page.getByRole("toolbar").getByRole("button", { name: "Detta" }).click();
    await expect(page.getByText("Ti ascolto…")).toBeVisible();
    await page.getByRole("toolbar").getByRole("button", { name: "Ferma" }).click();
    await expect(big(page)).toHaveAccessibleName(/Detta/);
  });
});

test("F01-E4 browser senza riconoscimento vocale: avviso e casella di prova funzionante", async ({ page }) => {
  await page.addInitScript(`delete window.SpeechRecognition; delete window.webkitSpeechRecognition;`);
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("non può ascoltarti");
  await expect(page.getByRole("button", { name: "Detta" }).last()).toBeDisabled();
  await say(page, "prova punto");
  await expect(editor(page)).toHaveText("Prova.");
});
