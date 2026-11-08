import { expect, test, type Page } from "@playwright/test";
import { editor } from "./helpers";

/**
 * Velocità dell'impaginazione A4 su un documento lungo (circa 50 fogli).
 * Misura il tempo che l'app impiega a rifare i fogli dopo una modifica (misura «pageLayout.run»).
 */

const PARAGRAPHS = 300;
const WORDS = Array.from({ length: 90 }, (_, i) => ["alfa", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta"][i % 8] + (i % 5 === 0 ? "," : "")).join(" ");

/** Scrive un documento di 300 paragrafi direttamente nel salvataggio del browser, poi lo ricarica. */
async function loadLongDocument(page: Page) {
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
  await page.evaluate(
    ({ n, text }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("elodict");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("documents", "readwrite");
          const content = { type: "doc", content: Array.from({ length: n }, () => ({ type: "paragraph", content: [{ type: "text", text }] })) };
          tx.objectStore("documents").put({ id: "lungo", title: "Lungo", content, language: "it", createdAt: 1, updatedAt: Date.now() + 1e9 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { n: PARAGRAPHS, text: WORDS },
  );
  await page.reload();
  await expect(editor(page)).toContainText("alfa");
}

/** Prepara l'ascolto della prossima misura «pageLayout.run» e restituisce un modo per leggerla. */
async function armMeasure(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { __lay: Promise<number> }).__lay = new Promise((resolve) => {
      const o = new PerformanceObserver((list) => {
        const e = list.getEntries().find((x) => x.name === "pageLayout.run");
        if (e) {
          o.disconnect();
          resolve(e.duration);
        }
      });
      o.observe({ entryTypes: ["measure"] });
    });
  });
  return () => page.evaluate(() => (window as unknown as { __lay: Promise<number> }).__lay);
}

/** Altezza e posizione (dall'alto del foglio) di ogni spazio fra i fogli. */
const SPACERS = (page: Page) =>
  page.locator(".page-spacer").evaluateAll((els) => els.map((e) => `${Math.round((e as HTMLElement).offsetTop)}:${Math.round(e.getBoundingClientRect().height)}`));

test.describe("Impaginazione di un documento di 50 fogli", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 800, "la misura si fa sul computer");
  test.setTimeout(120_000);

  for (const slow of [1, 4]) {
    test(`LAYOUT-P${slow === 1 ? 1 : 2} dopo una modifica i fogli si rifanno entro la soglia${slow > 1 ? ` (computer ${slow} volte più lento)` : ""}`, async ({ page }, info) => {
      await loadLongDocument(page);
      await expect.poll(() => page.locator(".page-spacer").count(), { timeout: 60_000 }).toBeGreaterThan(45);
      if (slow > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: slow });
      }
      const times: number[] = [];
      for (const place of ["inizio", "fine", "inizio"] as const) {
        await editor(page).click();
        await page.keyboard.press(place === "inizio" ? "Control+Home" : "Control+End");
        const read = await armMeasure(page);
        await page.keyboard.type("x");
        times.push(Math.round(await read()));
      }
      info.annotations.push({ type: "tempi (ms)", description: times.join(", ") });
      console.log(`LAYOUT x${slow} tempi di impaginazione dopo una modifica (ms): ${times.join(", ")}`);
      expect(Math.max(...times)).toBeLessThan(Number(process.env.LAYOUT_LIMIT_MS ?? 30) * slow);
    });
  }

  test("LAYOUT-E1 il risultato incrementale è identico a quello ricalcolato da zero", async ({ page }) => {
    await loadLongDocument(page);
    await expect.poll(() => page.locator(".page-spacer").count(), { timeout: 60_000 }).toBeGreaterThan(45);

    // modifiche in tre punti: cambiano le righe, spostano i fogli, aggiungono e tolgono paragrafi
    await editor(page).click();
    await page.keyboard.press("Control+Home");
    await page.keyboard.type("Un inizio molto più lungo del solito ".repeat(30));
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" coda");
    await page.keyboard.press("Enter");
    await page.keyboard.type("ultimo paragrafo");
    await page.keyboard.press("Control+Home");
    await page.keyboard.press("Delete");
    await expect(page.getByRole("status").filter({ hasText: /^Salvato/ })).toBeVisible();

    const incremental = await SPACERS(page);
    const pagesBefore = await page.locator(".page-spacer").count();
    expect(pagesBefore).toBeGreaterThan(45);

    await page.reload(); // dopo il ricaricamento tutti i blocchi sono nuovi: misura completa da zero
    await expect(editor(page)).toContainText("ultimo paragrafo");
    await expect.poll(() => page.locator(".page-spacer").count(), { timeout: 60_000 }).toBe(pagesBefore);
    expect(await SPACERS(page)).toEqual(incremental);
  });
});
