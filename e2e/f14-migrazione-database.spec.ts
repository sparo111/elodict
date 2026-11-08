import { expect, test } from "@playwright/test";
import { editor } from "./helpers";
import { OLD_DOC, OLD_SETTINGS, readRawDatabase, writeOldDatabase } from "./dbhelpers";

/**
 * Chi ha già usato l'app ha un database salvato con la versione attuale. Dopo ogni cambio di schema
 * il documento, le impostazioni, il dizionario e il microfono scelto devono esserci ancora, identici.
 */
test.describe("Database salvato con la versione attuale", () => {
  test("MIG-H1 documento, impostazioni, dizionario e microfono sopravvivono all'apertura con la versione nuova", async ({ page }) => {
    await page.goto("/installa.html"); // una pagina che non apre il database
    await writeOldDatabase(page);

    await page.goto("/");
    await expect(editor(page)).toContainText("Gentili condomini, assemblea rinviata.");
    await expect(editor(page)).toContainText("primo punto");

    const after = await readRawDatabase(page);
    // le impostazioni sono rimaste identiche: ogni campo, compresi dizionario e microfono scelto
    expect(after.settings).toEqual([OLD_SETTINGS]);
    // il documento ha ancora tutti i suoi campi di prima, con gli stessi valori
    expect(after.documents).toHaveLength(1);
    expect(after.documents[0]).toMatchObject(OLD_DOC);

    // e l'app li usa davvero: motore e dizionario sono quelli salvati
    await page.getByRole("button", { name: "Impostazioni" }).click();
    await expect(page.getByLabel(/Offline nel browser, con Whisper/)).toBeChecked();
    await expect(page.getByLabel("Modello offline")).toHaveValue("tiny");
    await expect(page.getByRole("dialog")).toContainText("Mimma");
  });

  test("MIG-H2 il documento di prima si può ancora modificare e salvare", async ({ page }) => {
    await page.goto("/installa.html");
    await writeOldDatabase(page);
    await page.goto("/");
    await expect(editor(page)).toContainText("assemblea");
    await editor(page).click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" Aggiunta.");
    await expect(page.getByRole("status").filter({ hasText: /^Salvato/ })).toBeVisible();
    const after = await readRawDatabase(page);
    expect(after.documents).toHaveLength(1);
    expect(after.documents[0]).toMatchObject({ id: OLD_DOC.id, createdAt: OLD_DOC.createdAt });
    expect(JSON.stringify(after.documents[0].content)).toContain("Aggiunta.");
    expect(after.settings).toEqual([OLD_SETTINGS]);
  });
});
