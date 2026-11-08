import { expect, test, type Page } from "@playwright/test";
import { OLD_DOC, OLD_SETTINGS, readRawDatabase, writeOldDatabase } from "./dbhelpers";

/**
 * Elodict aperto in due schede: il database è uno solo. Chi vuole aggiornarlo deve aspettare che l'altra scheda lo lasci
 * (eventi `blocked` e `versionchange`). Nessuno dei due casi deve far perdere qualcosa.
 */
const TITLES = {
  "it-IT": { blocked: "Elodict è aperto in un'altra scheda: chiudila per continuare", stale: "Elodict è stato aggiornato in un'altra scheda", action: "Ricarica la pagina", flag: "Italiano" },
  "en-US": { blocked: "Elodict is open in another tab: close it to continue", stale: "Elodict was updated in another tab", action: "Reload the page", flag: "English" },
  "fr-FR": { blocked: "Elodict est ouvert dans un autre onglet : fermez-le pour continuer", stale: "Elodict a été mis à jour dans un autre onglet", action: "Recharger la page", flag: "Français" },
  "es-ES": { blocked: "Elodict está abierto en otra pestaña: ciérrala para continuar", stale: "Elodict se ha actualizado en otra pestaña", action: "Recargar la página", flag: "Español" },
} as const;

type Held = { __held?: IDBDatabase };

/** Il campo di scrittura, in qualunque lingua (il nome cambia con la lingua dell'app). */
const editor = (page: Page) => page.getByRole("textbox").and(page.locator('[aria-multiline="true"]'));

/** Una scheda «ostinata»: tiene aperto il database della versione 1 e non lo lascia quando un'altra scheda chiede di aggiornarlo. */
async function holdDatabase(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("elodict");
        open.onsuccess = () => {
          (window as unknown as Held).__held = open.result; // nessun gestore di «versionchange»: non si chiude da sola
          resolve();
        };
        open.onerror = () => reject(open.error);
      }),
  );
}
/** Legge i documenti con la connessione già aperta (una nuova resterebbe in coda dietro all'aggiornamento in attesa). */
const readHeld = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ version: number; documents: unknown[] }>((resolve, reject) => {
        const db = (window as unknown as Held).__held!;
        const req = db.transaction("documents").objectStore("documents").getAll();
        req.onsuccess = () => resolve({ version: db.version, documents: req.result });
        req.onerror = () => reject(req.error);
      }),
  );
const releaseDatabase = (page: Page) => page.evaluate(() => (window as unknown as Held).__held?.close());

/** Un'«altra scheda» chiede di passare a una versione più nuova del database (come farebbe una versione futura dell'app). */
function upgradeFromOtherTab(page: Page, version = 300) {
  return page.evaluate(
    (v) =>
      new Promise<string>((resolve, reject) => {
        const req = indexedDB.open("elodict", v);
        req.onupgradeneeded = () => undefined;
        req.onsuccess = () => {
          req.result.close();
          resolve("aperto");
        };
        req.onerror = () => reject(req.error);
      }),
    version,
  );
}

for (const [locale, t] of Object.entries(TITLES)) {
  test.describe(`Due schede, lingua ${locale}`, () => {
    test.use({ locale });

    test(`TAB-B1 [${locale}] un'altra scheda tiene il database: avviso chiaro, niente si perde, e si va avanti da soli`, async ({ page, context }) => {
      // la scheda «ostinata»: ha aperto il database della versione 1 e lo tiene
      await page.goto("/installa.html");
      await writeOldDatabase(page);
      await holdDatabase(page);

      // la scheda nuova vuole aggiornare il database: aspetta e lo dice
      const tab = await context.newPage();
      await tab.goto("/");
      const alert = tab.getByRole("alert", { name: t.blocked });
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(locale === "it-IT" ? "Non è stato perso niente" : /./);
      await expect(editor(tab)).toHaveAttribute("contenteditable", "false"); // finché aspetta, non si scrive

      // intanto il database è com'era: versione 1, stessi dati
      const waiting = await readHeld(page);
      expect(waiting.version).toBe(10);
      expect(waiting.documents).toEqual([OLD_DOC]);

      // l'altra scheda lo lascia: questa va avanti da sola, senza ricaricare
      await releaseDatabase(page);
      await expect(alert).toHaveCount(0);
      await expect(editor(tab)).toContainText("Gentili condomini");
      await expect(editor(tab)).toHaveAttribute("contenteditable", "true");

      const done = await readRawDatabase(page);
      expect(done.version).toBe(20);
      expect(done.settings).toEqual([OLD_SETTINGS]);
      expect(done.documents).toEqual([{ ...OLD_DOC, openedAt: OLD_DOC.updatedAt }]);
    });

    test(`TAB-S1 [${locale}] un'altra scheda aggiorna il database: questa salva, lo chiude, avvisa e chiede di ricaricare`, async ({ page, context }) => {
      await page.goto("/");
      await expect(editor(page)).toBeVisible();
      await page.getByRole("banner").getByRole("button", { name: t.flag }).click(); // la lingua dell'avviso è quella dell'app
      await editor(page).click();
      await page.keyboard.type("scritto un attimo prima");
      // niente attesa: il salvataggio automatico parte dopo 600 ms, qui non deve servire

      const other = await context.newPage();
      await other.goto("/installa.html");
      expect(await upgradeFromOtherTab(other)).toBe("aperto"); // l'altra scheda NON resta bloccata

      const alert = page.getByRole("alert", { name: t.stale });
      await expect(alert).toBeVisible();
      await expect(alert.getByRole("button", { name: t.action })).toBeVisible();
      await expect(editor(page)).toHaveAttribute("contenteditable", "false"); // non si scrive più: niente da perdere

      // quello che era stato scritto è stato salvato prima di chiudere
      const raw = await readRawDatabase(other);
      expect(raw.version).toBe(300);
      expect(raw.documents).toHaveLength(1);
      expect(JSON.stringify(raw.documents[0].content)).toContain("scritto un attimo prima");

      // ricaricando si ritrova tutto
      await alert.getByRole("button", { name: t.action }).click();
      await expect(editor(page)).toContainText("scritto un attimo prima");
      await expect(page.getByRole("alert", { name: t.stale })).toHaveCount(0);
      await expect(editor(page)).toHaveAttribute("contenteditable", "true");
    });
  });
}

test.describe("Due schede: casi in più", () => {
  test("TAB-B2 l'avviso «chiudi l'altra scheda» non lampeggia se l'altra scheda si chiude subito", async ({ context }) => {
    // due schede dell'app (stessa versione, nessuna deve aspettare): nessuna vede avvisi
    const a = await context.newPage();
    await a.goto("/");
    await expect(editor(a)).toBeVisible();
    const b = await context.newPage();
    await b.goto("/");
    await expect(editor(b)).toBeVisible();
    await expect(a.getByRole("alert")).toHaveCount(0);
    await expect(b.getByRole("alert")).toHaveCount(0);
  });

  test("TAB-S2 dopo l'avviso, la scheda messa da parte non cambia più il database", async ({ page, context }) => {
    await page.goto("/installa.html");
    await writeOldDatabase(page);
    const tab = await context.newPage();
    await tab.goto("/");
    await expect(editor(tab)).toContainText("Gentili condomini");

    const other = await context.newPage();
    await other.goto("/installa.html");
    await upgradeFromOtherTab(other);
    await expect(tab.getByRole("alert", { name: TITLES["it-IT"].stale })).toBeVisible();
    const before = await readRawDatabase(other);

    // si prova che qualcosa NON succede, quindi si aspetta più del ritardo di salvataggio (600 ms)
    await tab.waitForTimeout(900);
    expect(await readRawDatabase(other)).toEqual(before);
  });
});
