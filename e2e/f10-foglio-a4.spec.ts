import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { editor, NO_PICKER, say, watchErrors } from "./helpers";

// Misure del foglio A4 a 96 punti per pollice: 210 x 297 mm = 794 x 1123 px, margini 96 px, intervallo fra fogli 24 px.
const W = 794, H = 1123, GAP = 24, MARGIN = 96, CONTENT = H - 2 * MARGIN, PITCH = H + GAP;

const sentence = "Questa è una frase di prova che serve a riempire il foglio e a vedere dove va a capo il testo quando finisce la pagina. ";
const words = (n: number) => Array.from({ length: n }, (_, i) => `parola${i % 10}`).join(" ");

/** Misure vere (senza zoom) di ogni parola scritta, e dove cade rispetto ai fogli. */
async function geometry(page: Page) {
  await page.waitForTimeout(900); // il calcolo dei fogli parte dopo ogni modifica
  return page.evaluate(
    ({ H, GAP, MARGIN, CONTENT }) => {
      const PITCH = H + GAP;
      const root = document.querySelector(".paper-stack .ProseMirror") as HTMLElement;
      const scale = Number(document.querySelector(".paper-scale")!.getAttribute("data-scale"));
      const top0 = root.getBoundingClientRect().top;
      const pages: { top: number; bottom: number; page: number }[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.nodeValue ?? "";
        const range = document.createRange();
        for (const m of text.matchAll(/\S+/g)) {
          range.setStart(n, m.index!);
          range.setEnd(n, m.index! + m[0].length);
          const r = range.getClientRects()[0];
          if (!r) continue;
          const top = (r.top - top0) / scale;
          const bottom = (r.bottom - top0) / scale;
          pages.push({ top, bottom, page: Math.floor(top / PITCH) });
        }
      }
      // parole che toccano il margine in basso, l'intervallo fra i fogli o il margine in alto
      const bad = pages.filter((w) => {
        const start = w.page * PITCH + MARGIN;
        return w.top < start - 1 || w.bottom > start + CONTENT + 1;
      });
      return { scale, words: pages.length, bad: bad.length, sheets: document.querySelectorAll(".paper-sheet").length, pages };
    },
    { H, GAP, MARGIN, CONTENT },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Il foglio è un A4", () => {
  test("PAGE-A4-1 misure: 794 x 1123 px (21 x 29,7 cm)", async ({ page }) => {
    const sheet = await page.locator(".paper-sheet").first().evaluate((el) => ({ w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight }));
    expect(sheet).toEqual({ w: W, h: H });
    expect(sheet.h / sheet.w).toBeCloseTo(297 / 210, 3);
  });

  test("PAGE-A4-2 un documento vuoto è un solo foglio, con «1 / 1»", async ({ page }) => {
    await expect(page.locator(".paper-sheet")).toHaveCount(1);
    await expect(page.locator(".paper-number")).toHaveText("1 / 1");
  });

  test("PAGE-A4-3 il foglio si vede intero: non esce dallo schermo", async ({ page }) => {
    const box = await page.locator(".paper-sheet").first().boundingBox();
    const vw = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
  });

  test("PAGE-A4-4 il testo parte dal margine di 2,54 cm", async ({ page }) => {
    await say(page, "primo");
    const g = await geometry(page);
    expect(g.pages[0].top).toBeGreaterThanOrEqual(MARGIN - 1);
    expect(g.pages[0].top).toBeLessThan(MARGIN + 12);
  });

  test("PAGE-A4-5 il segnaposto sta dentro il foglio, non fuori", async ({ page }) => {
    const r = await page.locator(".paper-placeholder").evaluate((el) => {
      const sheet = document.querySelector(".paper-sheet")!.getBoundingClientRect();
      const p = el.getBoundingClientRect();
      return { insideX: p.left >= sheet.left && p.right <= sheet.right, insideY: p.top >= sheet.top && p.bottom <= sheet.bottom };
    });
    expect(r).toEqual({ insideX: true, insideY: true });
  });
});

test.describe("A fine foglio il testo va al foglio dopo", () => {
  test("PAGE-FLOW-1 molto testo = più fogli, e nessuna parola tocca margini o intervallo", async ({ page }) => {
    const check = watchErrors(page);
    await say(page, sentence.repeat(60));
    const g = await geometry(page);
    expect(g.sheets).toBeGreaterThanOrEqual(2);
    expect(g.bad).toBe(0);
    await expect(page.locator(".paper-number").first()).toHaveText(new RegExp(`^1 / ${g.sheets}$`));
    check();
  });

  test("PAGE-FLOW-2 l'ultima parola sta davvero sull'ultimo foglio", async ({ page }) => {
    await say(page, sentence.repeat(60));
    const g = await geometry(page);
    expect(g.pages[g.pages.length - 1].page).toBe(g.sheets - 1);
    expect(g.pages[0].page).toBe(0);
  });

  test("PAGE-FLOW-3 un solo paragrafo lunghissimo si spezza a metà riga di foglio, riempiendo il primo", async ({ page }) => {
    await say(page, words(900));
    const g = await geometry(page);
    expect(g.sheets).toBeGreaterThanOrEqual(2);
    expect(g.bad).toBe(0);
    // l'ultima riga del primo foglio arriva vicino al margine in basso (non si butta via mezzo foglio)
    const first = g.pages.filter((w) => w.page === 0);
    const lastBottom = Math.max(...first.map((w) => w.bottom));
    expect(lastBottom).toBeGreaterThan(MARGIN + CONTENT - 40);
  });

  test("PAGE-FLOW-4 cancellando il testo torna un foglio solo", async ({ page }) => {
    await say(page, sentence.repeat(60));
    expect((await geometry(page)).sheets).toBeGreaterThanOrEqual(2);
    await editor(page).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    const g = await geometry(page);
    expect(g.sheets).toBe(1);
    expect(g.words).toBe(0);
  });

  test("PAGE-FLOW-5 scrivere all'inizio spinge il testo in basso e aggiunge un foglio", async ({ page }) => {
    await say(page, words(250));
    const before = (await geometry(page)).sheets;
    await editor(page).click();
    await page.keyboard.press("Control+Home");
    await page.keyboard.insertText(words(400) + " ");
    const g = await geometry(page);
    expect(g.sheets).toBeGreaterThan(before);
    expect(g.bad).toBe(0);
  });

  test("PAGE-FLOW-6 con titoli, paragrafi e un elenco lungo nessuna riga tocca i margini", async ({ page }) => {
    await editor(page).click();
    await page.getByRole("button", { name: "Titolo" }).click();
    await page.keyboard.type("Un titolo");
    await page.keyboard.press("Enter");
    await page.keyboard.insertText(sentence.repeat(8));
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Elenco puntato" }).click();
    for (let i = 0; i < 55; i++) {
      await page.keyboard.insertText(`voce numero ${i} dell'elenco`);
      await page.keyboard.press("Enter");
    }
    const g = await geometry(page);
    expect(g.sheets).toBeGreaterThanOrEqual(2);
    expect(g.bad).toBe(0);
  });

  test("PAGE-FLOW-7 dopo il ricaricamento i fogli e il testo ci sono ancora, e a posto", async ({ page }) => {
    await say(page, sentence.repeat(60));
    const n = (await geometry(page)).sheets;
    await page.waitForTimeout(900);
    await page.reload();
    const g = await geometry(page);
    expect(g.sheets).toBe(n);
    expect(g.bad).toBe(0);
  });

  test("PAGE-FLOW-8 anche con lo zoom cambiato la disposizione non cambia", async ({ page }) => {
    await say(page, sentence.repeat(60));
    const a = await geometry(page);
    await page.getByLabel("Zoom del foglio").selectOption("0.75");
    const b = await geometry(page);
    expect(b.scale).toBeCloseTo(0.75, 2);
    expect(b.sheets).toBe(a.sheets);
    expect(b.bad).toBe(0);
  });
});

test.describe("Zoom", () => {
  test("PAGE-ZOOM-1 100% = il foglio è largo 794 px", async ({ page }) => {
    await page.getByLabel("Zoom del foglio").selectOption("1");
    const w = await page.locator(".paper-sheet").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(w)).toBe(W);
  });

  test("PAGE-ZOOM-2 75% e 150% scalano il foglio", async ({ page }) => {
    const sel = page.getByLabel("Zoom del foglio");
    await sel.selectOption("0.75");
    expect(Math.round(await page.locator(".paper-sheet").first().evaluate((el) => el.getBoundingClientRect().width))).toBe(Math.round(W * 0.75));
    await sel.selectOption("1.5");
    expect(Math.round(await page.locator(".paper-sheet").first().evaluate((el) => el.getBoundingClientRect().width))).toBe(Math.round(W * 1.5));
  });

  test("PAGE-ZOOM-3 'Adatta' non ingrandisce mai oltre il 100% e non esce dallo schermo", async ({ page }) => {
    const w = await page.locator(".paper-sheet").first().evaluate((el) => el.getBoundingClientRect().width);
    expect(w).toBeLessThanOrEqual(W + 1);
    expect(w).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("PAGE-ZOOM-4 a 150% si scorre di lato senza rompere la pagina", async ({ page }) => {
    await page.getByLabel("Zoom del foglio").selectOption("1.5");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("I fogli non sporcano ciò che si esporta", () => {
  test("PAGE-EXP-1 il file .txt contiene solo le parole scritte", async ({ page }) => {
    await page.addInitScript(NO_PICKER);
    await page.goto("/");
    await say(page, words(900));
    await geometry(page);
    await page.getByRole("button", { name: "Esporta" }).click();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Testo semplice/ }).click()]);
    const text = fs.readFileSync((await dl.path())!, "utf8");
    expect(text.split(/\s+/).filter(Boolean)).toHaveLength(900);
    expect(text).not.toMatch(/[​ ￼]/);
  });

  test("PAGE-EXP-2 la dettatura continua sul foglio dopo", async ({ page }) => {
    await say(page, sentence.repeat(30));
    await say(page, "fine del testo punto");
    await expect(editor(page)).toContainText("Fine del testo.");
    const g = await geometry(page);
    expect(g.bad).toBe(0);
  });
});
