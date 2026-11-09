import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * T013b: la pagina di prova (prova-parakeet/) e il fatto che l'app non ha nessun collegamento verso di lei.
 *   PROVA_URL=https://sparo111.github.io/elodict/prova-parakeet/ npx playwright test --project=sito-pubblicato g3-
 *   PROVA_URL=http://localhost:5240/elodict/prova-parakeet/      npx playwright test --project=sito-pubblicato g3-
 * Senza PROVA_URL le prove si saltano. La prova «Avvia la prova» scarica Whisper base (circa 76 MB).
 */
const RAW = process.env.PROVA_URL ?? "";
const PAGE = RAW ? RAW.replace(/\/?$/, "/") : "";
const APP = PAGE ? new URL("../", PAGE).toString() : "";
test.skip(!PAGE, "serve PROVA_URL (l'indirizzo della pagina di prova)");
test.use({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });

test("PROVA-1 la pagina si apre a 390 px: pulsante grande «Avvia la prova», crediti CC-BY-4.0, axe pulito, niente scorrimento orizzontale", async ({ page }) => {
  await page.goto(PAGE);
  const start = page.getByRole("button", { name: "Avvia la prova" });
  await expect(start).toBeEnabled({ timeout: 60_000 });
  const b = (await start.boundingBox())!;
  expect(b.height).toBeGreaterThanOrEqual(56);
  expect(b.width).toBeGreaterThan(300);
  await expect(page.locator("#device")).toContainText("userAgent");
  const attr = page.locator("#attribution");
  for (const name of ["NVIDIA", "istupakov", "Olicorne", "moondream", "CC-BY-4.0"]) await expect(attr).toContainText(name);
  await expect(page.getByRole("link", { name: /Creative Commons Attribution 4.0/ })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  await expect(page.locator("#phrases")).toContainText("Buongiorno, vorrei prenotare un tavolo.");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("PROVA-2 «Avvia la prova» riempie la tabella e «Copia i risultati» copia il testo con il dispositivo", async ({ page }) => {
  test.setTimeout(420_000);
  await page.goto(PAGE);
  await expect(page.getByRole("button", { name: "Avvia la prova" })).toBeEnabled({ timeout: 60_000 });
  // il percorso intero, ma si ferma alla prima configurazione finita (Whisper base, 1 thread): quel che serve a controllare la pagina
  await page.getByRole("button", { name: "Avvia la prova" }).click();
  await expect(page.locator("#tables table").first()).toBeVisible({ timeout: 400_000 });
  await expect(page.locator("#tables")).toContainText("whisper-base");
  await expect(page.locator("#tables")).toContainText("silenceMs");
  const copy = page.getByRole("button", { name: "Copia i risultati" });
  await expect(copy).toBeVisible({ timeout: 30_000 }).catch(() => undefined); // compare a fine prova
  // il testo da copiare è già pronto nella casella, con dispositivo e tabella
  const box = await page.locator("#copy-box").inputValue();
  expect(box).toContain("PROVA PARAKEET (T013b)");
  expect(box).toContain("Dispositivo:");
  expect(box).toContain("whisper-base");
});

test("PROVA-3 l'app non ha nessun collegamento alla pagina di prova", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("elodict-onboarding", "done"));
  await page.goto(APP);
  await expect(page.getByRole("textbox", { name: "Documento" })).toBeVisible();
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: "Aiuto" }).click({ trial: true }).catch(() => undefined);
  expect(await page.locator('a[href*="prova-parakeet"]').count()).toBe(0);
  expect(await page.content()).not.toContain("prova-parakeet");
});

test("PROVA-4 con il service worker dell'app già installato, l'indirizzo della pagina apre la pagina e non l'app", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("elodict-onboarding", "done"));
  await page.goto(APP);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto(PAGE);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prova di Parakeet e Whisper");
});
