import AxeBuilder from "@axe-core/playwright";
import { chromium, expect, test } from "@playwright/test";
import { editor, watchErrors } from "./helpers";

/**
 * T001e: l'iPhone. Motore WebKit (quello di Safari) con il profilo «iPhone 15».
 * Il progetto «pwa-iphone» punta alla versione costruita sulla porta 5200; la prova della sottocartella usa la 5201.
 */
const PWA = "http://localhost:5200";
const BASE = "http://localhost:5201";
const LANGS = [
  { lang: "it", open: "Apri Elodict", title: "Come installare Elodict", what: "Cos'è Elodict", first: "Premi «Apri Elodict»" },
  { lang: "en", open: "Open Elodict", title: "How to install Elodict", what: "What is Elodict", first: "Press «Open Elodict»" },
  { lang: "fr", open: "Ouvrir Elodict", title: "Comment installer Elodict", what: "Qu'est-ce qu'Elodict", first: "Appuyez sur «Ouvrir Elodict»" },
  { lang: "es", open: "Abrir Elodict", title: "Cómo instalar Elodict", what: "Qué es Elodict", first: "Pulsa «Abrir Elodict»" },
] as const;

test.describe("installa.html su iPhone", () => {
  for (const L of LANGS) {
    test(`${L.lang}: pulsante grande sotto la dedica e prima di «${L.what}», senza errori di accessibilità`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(`${PWA}/installa.html?lang=${L.lang}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(L.title);
      const btn = page.getByRole("link", { name: L.open, exact: true });
      await expect(btn).toBeVisible();
      const [b, d, w] = await Promise.all([
        btn.boundingBox(),
        page.locator("#dedication").boundingBox(),
        page.getByRole("heading", { name: L.what }).boundingBox(),
      ]);
      expect(d!.y).toBeLessThan(b!.y);
      expect(b!.y).toBeLessThan(w!.y);
      expect(b!.height).toBeGreaterThanOrEqual(56); // grande: ben oltre i 44 punti minimi di Apple
      expect(b!.width).toBeGreaterThan(300);
      // visibile senza scorrere
      expect(b!.y + b!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      // le istruzioni per iPhone cominciano da «Apri Elodict» e dicono di usare Safari
      const steps = page.locator("#iphone li");
      await expect(steps).toHaveCount(4);
      await expect(steps.first()).toContainText(L.first);
      await expect(steps.first()).toContainText("Safari");
      await expect(page.locator("#iphone")).toContainText("…");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      errors();
    });
  }

  test("il pulsante porta all'app, e il primo avvio parte", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`${PWA}/installa.html?lang=it`);
    await page.getByRole("link", { name: "Apri Elodict", exact: true }).tap();
    await expect(page).toHaveURL(`${PWA}/`);
    const dlg = page.getByRole("dialog", { name: "Che lingua parli?" });
    await expect(dlg).toBeVisible();
    expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
    await dlg.getByRole("button", { name: "Avanti" }).click();
    await expect(page.getByRole("button", { name: "Consenti il microfono" })).toBeVisible();
    errors();
  });

  test("l'app, a primo avvio fatto, si apre e non ha errori di accessibilità", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("elodict-onboarding", "done"));
    const errors = watchErrors(page);
    await page.goto(`${PWA}/`);
    await expect(editor(page)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    errors();
  });

  test("installa.html ha lo stesso manifest dell'app (start_url = app)", async ({ page, request }) => {
    await page.goto(`${PWA}/installa.html`);
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const m = await (await request.get(new URL(href!, `${PWA}/installa.html`).toString())).json();
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    await page.goto(`${PWA}/`);
    expect(new URL((await page.locator('link[rel="manifest"]').getAttribute("href"))!, page.url()).href).toBe(new URL(href!, `${PWA}/installa.html`).href);
    await page.goto(`${PWA}/installa.html`);
    expect(await page.locator('link[rel="apple-touch-icon"]').getAttribute("href")).toContain("apple-touch-icon.png");
    expect(await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute("content")).toBe("yes");
  });

  test("se installa.html è aperta dall'icona (modalità app), apre l'app e non le istruzioni", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "standalone", { value: true });
      localStorage.setItem("elodict-onboarding", "done");
    });
    await page.goto(`${PWA}/installa.html`);
    await expect(page).toHaveURL(`${PWA}/`);
    await expect(editor(page)).toBeVisible();
  });

  test("senza la modalità app, installa.html resta sulle istruzioni", async ({ page }) => {
    await page.goto(`${PWA}/installa.html`);
    await expect(page).toHaveURL(`${PWA}/installa.html`);
  });

  test("sotto /elodict/ il pulsante porta a /elodict/ (rispetta VITE_BASE)", async ({ page, request }) => {
    await page.goto(`${BASE}/elodict/installa.html?lang=it`);
    const btn = page.getByRole("link", { name: "Apri Elodict", exact: true });
    await expect(btn).toBeVisible();
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const m = await (await request.get(new URL(href!, `${BASE}/elodict/installa.html`).toString())).json();
    expect(m.start_url).toBe("/elodict/");
    await btn.tap();
    await expect(page).toHaveURL(`${BASE}/elodict/`);
  });
});

// WebKit non sa fare il PDF: la stampa su un foglio A4 si prova con Chromium sullo stesso file.
test("stampa: «Come si installa» sta ancora su 1 foglio A4 per lingua (pulsante nascosto in stampa)", async () => {
  const browser = await chromium.launch();
  try {
    for (const L of LANGS) {
      const page = await browser.newPage();
      await page.goto(`${PWA}/installa.html?lang=${L.lang}`);
      await expect(page.getByRole("link", { name: L.open, exact: true })).toBeVisible();
      await page.emulateMedia({ media: "print" });
      await expect(page.getByRole("link", { name: L.open, exact: true })).toBeHidden();
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pages, L.lang).toBe(1);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
