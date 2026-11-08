import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { NO_PICKER, say } from "./helpers";

const DEDICA = {
  it: "Creata per Mimma, in segno di profonda gratitudine per la sua onestà intellettuale.",
  en: "Made for Mimma, with deep gratitude for her intellectual honesty.",
  fr: "Créée pour Mimma, en signe de profonde gratitude pour son honnêteté intellectuelle.",
  es: "Creada para Mimma, en señal de profunda gratitud por su honestidad intelectual.",
} as const;
const FLAG = { it: "Italiano", en: "English", fr: "Français", es: "Español" } as const;
const SETTINGS = { it: "Impostazioni", en: "Settings", fr: "Réglages", es: "Ajustes" } as const;

test("la dedica è in fondo a Impostazioni, nelle 4 lingue", async ({ page }) => {
  await page.goto("/");
  for (const lang of ["it", "en", "fr", "es"] as const) {
    await page.getByRole("banner").getByRole("button", { name: FLAG[lang] }).click();
    await page.getByRole("button", { name: SETTINGS[lang] }).click();
    await expect(page.getByRole("dialog").getByText(DEDICA[lang], { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
  }
});

test("la dedica non finisce nei file esportati", async ({ page }) => {
  await page.addInitScript(NO_PICKER);
  await page.goto("/");
  await say(page, "ciao mondo punto");
  for (const [label, ext] of [["Markdown", "md"], ["Testo semplice", "txt"], ["Pagina web", "html"]]) {
    await page.getByRole("button", { name: "Esporta" }).click();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: new RegExp(label) }).click()]);
    const text = fs.readFileSync((await dl.path())!, "utf8");
    expect(text, ext).toContain("Ciao mondo.");
    expect(text, ext).not.toMatch(/Mimma/);
  }
});
