import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { editor, FAKE_SPEECH, say } from "./helpers";

test.describe("Salvataggio automatico", () => {
  test("SAVE-H1 il testo resta dopo aver ricaricato la pagina", async ({ page }) => {
    await page.goto("/");
    await say(page, "da non perdere punto");
    await expect(page.getByText("Salvato su questo dispositivo")).toBeVisible();
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(editor(page)).toHaveText("Da non perdere.");
  });

  test("SAVE-E1 l'app funziona anche se il salvataggio nel browser non è permesso", async ({ page }) => {
    await page.addInitScript(`Object.defineProperty(window, "indexedDB", { value: undefined });`);
    await page.goto("/");
    await say(page, "ciao");
    await expect(editor(page)).toHaveText("Ciao");
  });
});

test.describe("Barra degli strumenti", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("BAR-H1 annulla e ripeti partono spenti e si accendono", async ({ page }) => {
    const bar = page.getByRole("toolbar");
    await expect(bar.getByRole("button", { name: "Annulla" })).toBeDisabled();
    await say(page, "ciao");
    await expect(bar.getByRole("button", { name: "Annulla" })).toBeEnabled();
    await bar.getByRole("button", { name: "Annulla" }).click();
    await expect(editor(page)).toHaveText("");
    await expect(bar.getByRole("button", { name: "Ripeti" })).toBeEnabled();
  });

  test("BAR-H2 grassetto, corsivo, sottolineato si accendono sul testo selezionato", async ({ page }) => {
    await editor(page).click();
    await page.keyboard.type("testo");
    await page.keyboard.press("Control+A");
    for (const name of ["Grassetto", "Corsivo", "Sottolineato"]) {
      const b = page.getByRole("button", { name });
      await b.click();
      await expect(b).toHaveAttribute("aria-pressed", "true");
    }
    await expect(editor(page).locator("strong em u, strong u em, em strong u, u strong em")).toHaveCount(1);
  });

  test("BAR-H3 elenco puntato, numerato e titolo", async ({ page }) => {
    await editor(page).click();
    await page.getByRole("button", { name: "Elenco puntato" }).click();
    await page.keyboard.type("uno");
    await expect(editor(page).locator("ul li")).toHaveCount(1);
    await page.getByRole("button", { name: "Elenco numerato" }).click();
    await expect(editor(page).locator("ol li")).toHaveCount(1);
    await page.getByRole("button", { name: "Elenco numerato" }).click();
    await page.getByRole("button", { name: "Titolo" }).click();
    await expect(editor(page).locator("h2")).toHaveCount(1);
  });

  test("BAR-E1 cliccare un'icona non fa perdere il cursore", async ({ page }) => {
    await editor(page).click();
    await page.keyboard.type("ab");
    await page.getByRole("button", { name: "Grassetto" }).click();
    await page.keyboard.type("cd");
    await expect(editor(page).locator("strong")).toHaveText("cd");
  });
});

test.describe("Accessibilità (axe)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(info.project.name === "mobile", "una volta basta, sul desktop");
  });

  test("A11Y-1 pagina principale senza violazioni", async ({ page }) => {
    await page.goto("/");
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
  });

  test("A11Y-2 con testo, errore e finestre aperte", async ({ page }) => {
    await page.addInitScript(FAKE_SPEECH);
    await page.goto("/");
    await say(page, "ciao virgola mondo");
    await page.getByRole("button", { name: "Detta" }).last().click();
    await page.evaluate(() => (window as any).__fail("not-allowed"));
    let r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
    for (const name of ["Impostazioni", "Aiuto", "Esporta", "Invia"]) {
      await page.getByRole("button", { name }).click();
      r = await new AxeBuilder({ page }).analyze();
      expect(r.violations.map((v) => `${name} → ${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
      await page.keyboard.press("Escape");
    }
  });
});

test("MOB-1 nessuno scorrimento orizzontale e tutto raggiungibile (vale su mobile e desktop)", async ({ page }) => {
  await page.goto("/");
  await say(page, "parola ".repeat(200));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("button", { name: "Detta" }).last()).toBeInViewport();
});
