import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SOURCE_CODE_URL } from "../src/legal";

const FLAGS = [
  ["Italiano", "Impostazioni", "Codice sorgente (licenza AGPL-3.0)"],
  ["English", "Settings", "Source code (AGPL-3.0 license)"],
  ["Français", "Réglages", "Code source (licence AGPL-3.0)"],
  ["Español", "Ajustes", "Código fuente (licencia AGPL-3.0)"],
] as const;

test("LIC-1 in fondo a Impostazioni c'è il collegamento al codice sorgente, nelle 4 lingue, con l'indirizzo unico", async ({ page }) => {
  await page.goto("/");
  for (const [flag, settings, label] of FLAGS) {
    await page.getByRole("banner").getByRole("button", { name: flag }).click();
    await page.getByRole("button", { name: settings }).click();
    const link = page.getByRole("dialog").getByRole("link", { name: label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", SOURCE_CODE_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await page.keyboard.press("Escape");
  }
});

test("LIC-2 il collegamento non crea errori di accessibilità", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
});
