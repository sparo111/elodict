import { expect, test } from "@playwright/test";
import { setLanguage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("F03-H1 cambio la lingua dell'app e i testi cambiano", async ({ page }) => {
  await setLanguage(page, "ui", "en");
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("Press “Dictate”")).toBeVisible();
  await setLanguage(page, "ui", "fr");
  await expect(page.getByRole("button", { name: "Réglages" })).toBeVisible();
  await setLanguage(page, "ui", "es");
  await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
});

test("F03-H2 la lingua dell'app resta dopo il ricaricamento", async ({ page }) => {
  await setLanguage(page, "ui", "en");
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
});

test("F03-E1 Esc chiude la finestra e la tastiera basta per aprirla", async ({ page }) => {
  await page.getByRole("button", { name: "Impostazioni" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("F04-H1 l'aiuto elenca i comandi della lingua scelta", async ({ page }) => {
  await page.getByRole("button", { name: "Aiuto" }).click();
  const d = page.getByRole("dialog");
  await expect(d).toContainText("Italiano");
  await expect(d).toContainText("«punto interrogativo»");
  await page.keyboard.press("Escape");
  await setLanguage(page, "dictation", "es");
  await page.getByRole("button", { name: "Aiuto" }).click();
  await expect(page.getByRole("dialog")).toContainText("signo de interrogación");
});

test("F04-E1 il pulsante Chiudi della finestra funziona", async ({ page }) => {
  await page.getByRole("button", { name: "Aiuto" }).click();
  await page.getByRole("button", { name: "Chiudi" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
