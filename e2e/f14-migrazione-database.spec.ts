import { expect, test } from "@playwright/test";
import fs from "node:fs";
import { editor } from "./helpers";
import { OLD_DOC, OLD_SETTINGS, readRawDatabase, writeOldDatabase } from "./dbhelpers";

/**
 * Chi ha già usato l'app ha un database salvato con la versione attuale. Dopo ogni cambio di schema
 * il documento, le impostazioni, il dizionario e il microfono scelto devono esserci ancora, identici.
 * E se l'aggiornamento del database non riesce, l'app non deve cancellare niente.
 */
test.describe("Database salvato con la versione attuale", () => {
  test("MIG-H1 documento, impostazioni, dizionario e microfono sopravvivono all'apertura con la versione nuova", async ({ page }) => {
    await page.goto("/installa.html"); // una pagina che non apre il database
    await writeOldDatabase(page);
    expect((await readRawDatabase(page)).version).toBe(10); // partiamo davvero dalla versione 1

    await page.goto("/");
    await expect(editor(page)).toContainText("Gentili condomini, assemblea rinviata.");
    await expect(editor(page)).toContainText("primo punto");

    const after = await readRawDatabase(page);
    expect(after.version).toBe(20); // la migrazione è stata eseguita
    // le impostazioni sono rimaste identiche: ogni campo, compresi dizionario e microfono scelto
    expect(after.settings).toEqual([OLD_SETTINGS]);
    // il documento ha ancora tutti i suoi campi di prima, con gli stessi valori; in più l'ultima apertura (= ultima modifica)
    expect(after.documents).toHaveLength(1);
    expect(after.documents[0]).toEqual({ ...OLD_DOC, openedAt: OLD_DOC.updatedAt });

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
    expect(after.documents[0]).toMatchObject({ id: OLD_DOC.id, createdAt: OLD_DOC.createdAt, openedAt: OLD_DOC.updatedAt });
    expect(JSON.stringify(after.documents[0].content)).toContain("Aggiunta.");
    expect(after.settings).toEqual([OLD_SETTINGS]);
  });

  test("MIG-H3 con più documenti salvati, la migrazione li porta tutti e si riapre l'ultimo modificato", async ({ page }) => {
    const docs = ["uno", "due", "tre"].map((word, i) => ({
      ...OLD_DOC,
      id: `d-${word}`,
      title: word,
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: `testo ${word}` }] }] },
      updatedAt: 1_700_000_000_000 + i * 1000,
    }));
    await page.goto("/installa.html");
    await writeOldDatabase(page, docs);
    await page.goto("/");
    await expect(editor(page)).toContainText("testo tre");
    const after = await readRawDatabase(page);
    expect(after.documents.map((d) => d.id).sort()).toEqual(["d-due", "d-tre", "d-uno"]);
    for (const d of after.documents) expect(d.openedAt).toBe(d.updatedAt);
  });
});

test.describe("Se l'aggiornamento del database non riesce", () => {
  test("MIG-N1 non si cancella niente: avviso, copia di sicurezza scaricabile, niente viene salvato", async ({ page, context }) => {
    // 1) si prepara il database della versione attuale
    await page.goto("/installa.html");
    await writeOldDatabase(page);

    // 2) si apre l'app con la migrazione che fallisce di proposito
    const broken = await context.newPage();
    await broken.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__ELODICT_FAIL_MIGRATION__ = true;
    });
    await broken.goto("/");
    const alert = broken.getByRole("alert", { name: "Non riesco ad aprire i tuoi documenti salvati" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Non è stato cancellato niente");

    // anche scrivendo, non si salva niente (il database non è aperto)
    await editor(broken).click();
    await broken.keyboard.type("scritto mentre il database non si apre");

    // 3) la copia di sicurezza si scarica e contiene i dati di prima
    const [download] = await Promise.all([broken.waitForEvent("download"), alert.getByRole("button", { name: "Scarica la copia di sicurezza" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^elodict-copia-\d{4}-\d{2}-\d{2}\.json$/);
    const copy = JSON.parse(fs.readFileSync((await download.path())!, "utf8"));
    expect(copy.app).toBe("elodict");
    expect(copy.documents).toEqual([OLD_DOC]);
    expect(copy.settings).toEqual({ ...OLD_SETTINGS, id: undefined });
    await expect(alert).toContainText("Copia scaricata");

    // 4) nel database non è cambiato nulla: stessa versione, stessi dati (si aspetta più del ritardo di salvataggio, 600 ms,
    //    perché si prova che qualcosa NON succede)
    await broken.waitForTimeout(1200);
    const raw = await readRawDatabase(page);
    expect(raw.version).toBe(10);
    expect(raw.documents).toEqual([OLD_DOC]);
    expect(raw.settings).toEqual([OLD_SETTINGS]);
    await broken.close();

    // 5) risolto il problema (qui: senza il guasto simulato), la stessa pagina si apre e migra senza perdere niente
    await page.goto("/");
    await expect(editor(page)).toContainText("assemblea rinviata");
    await expect(page.getByRole("alert", { name: "Non riesco ad aprire i tuoi documenti salvati" })).toHaveCount(0);
    const healed = await readRawDatabase(page);
    expect(healed.version).toBe(20);
    expect(healed.documents[0]).toEqual({ ...OLD_DOC, openedAt: OLD_DOC.updatedAt });
    expect(healed.settings).toEqual([OLD_SETTINGS]);
  });
});
