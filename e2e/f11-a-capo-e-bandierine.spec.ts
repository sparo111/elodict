import { expect, test, type Page } from "@playwright/test";
import { editor, say, watchErrors } from "./helpers";

const W = 794, MARGIN = 96, RIGHT_LIMIT = W - MARGIN; // il testo non deve passare il margine destro (698 px)
const sentence = "Questa è una frase di prova che serve a riempire il foglio e a vedere dove va a capo il testo quando finisce la riga. ";

/** Bordi destro e sinistro di ogni pezzo di testo, e quante righe diverse ci sono (misure vere, senza zoom). */
async function lineMetrics(page: Page) {
  await page.waitForTimeout(900);
  return page.evaluate(() => {
    const root = document.querySelector(".paper-stack .ProseMirror") as HTMLElement;
    const scale = Number(document.querySelector(".paper-scale")!.getAttribute("data-scale"));
    const left0 = root.getBoundingClientRect().left;
    const top0 = root.getBoundingClientRect().top;
    let maxRight = 0;
    let minLeft = Number.POSITIVE_INFINITY;
    const tops = new Set<number>();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width === 0) continue;
        maxRight = Math.max(maxRight, (r.right - left0) / scale);
        minLeft = Math.min(minLeft, (r.left - left0) / scale);
        tops.add(Math.round((r.top - top0) / scale / 4)); // righe diverse, tolleranza di qualche pixel
      }
    }
    return { maxRight, minLeft, lines: tops.size };
  });
}

test.describe("A capo a fine riga", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("WRAP-1 il testo va a capo da solo al margine destro, su più righe", async ({ page }) => {
    await say(page, sentence.repeat(6));
    const m = await lineMetrics(page);
    expect(m.lines).toBeGreaterThan(6);
    expect(m.maxRight).toBeLessThanOrEqual(RIGHT_LIMIT + 1); // non esce mai dal margine destro
    expect(m.minLeft).toBeGreaterThanOrEqual(MARGIN - 1); // né da quello sinistro
  });

  test("WRAP-2 le righe si riempiono fino al margine (non vanno a capo troppo presto)", async ({ page }) => {
    await say(page, sentence.repeat(6));
    const m = await lineMetrics(page);
    expect(m.maxRight).toBeGreaterThan(RIGHT_LIMIT - 70);
  });

  test("WRAP-3 anche una parola lunghissima senza spazi si spezza e resta dentro il foglio", async ({ page }) => {
    await say(page, "a".repeat(400));
    const m = await lineMetrics(page);
    expect(m.lines).toBeGreaterThan(1);
    expect(m.maxRight).toBeLessThanOrEqual(RIGHT_LIMIT + 1);
  });

  test("WRAP-4 un indirizzo web lungo resta dentro il foglio", async ({ page }) => {
    await say(page, "vai su https://esempio.it/una/strada/molto/molto/lunga/che/non/finisce/mai/e/continua/ancora/e/ancora/fino/alla/fine/della/riga ora");
    const m = await lineMetrics(page);
    expect(m.maxRight).toBeLessThanOrEqual(RIGHT_LIMIT + 1);
  });

  test("WRAP-5 con zoom diverso il testo va a capo negli stessi punti", async ({ page }) => {
    await say(page, sentence.repeat(6));
    const a = await lineMetrics(page);
    await page.getByLabel("Zoom del foglio").selectOption("0.75");
    const b = await lineMetrics(page);
    expect(b.lines).toBe(a.lines);
    expect(b.maxRight).toBeLessThanOrEqual(RIGHT_LIMIT + 1);
  });

  test("WRAP-6 scrivendo con la tastiera il testo va a capo da solo", async ({ page }) => {
    await editor(page).click();
    await page.keyboard.insertText(sentence.repeat(4));
    const m = await lineMetrics(page);
    expect(m.lines).toBeGreaterThan(4);
    expect(m.maxRight).toBeLessThanOrEqual(RIGHT_LIMIT + 1);
  });
});

const flag = (page: Page, name: string) => page.getByRole("group", { name: /Lingua dell'app e della voce|Language of the app|Langue de l'application|Idioma de la aplicación/ }).getByRole("button", { name });

test.describe("Bandierine accanto al nome", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("FLAG-1 ci sono 4 bandierine e quella della lingua attuale è premuta", async ({ page }) => {
    for (const name of ["Italiano", "English", "Français", "Español"]) await expect(flag(page, name)).toBeVisible();
    await expect(flag(page, "Italiano")).toHaveAttribute("aria-pressed", "true");
    await expect(flag(page, "English")).toHaveAttribute("aria-pressed", "false");
  });

  test("FLAG-2 hanno i colori delle bandiere (disegnate, non lettere)", async ({ page }) => {
    await expect(flag(page, "Italiano").locator('svg rect[fill="#009246"]')).toHaveCount(1);
    await expect(flag(page, "Français").locator('svg rect[fill="#0055a4"]')).toHaveCount(1);
    await expect(flag(page, "Español").locator('svg rect[fill="#aa151b"]')).toHaveCount(1);
    await expect(flag(page, "English").locator('svg path[fill="#012169"]')).toHaveCount(1);
  });

  test("FLAG-3 sono vicine al nome dell'app, sulla stessa riga", async ({ page }) => {
    const name = await page.getByRole("heading", { level: 1 }).boundingBox();
    const italiano = await flag(page, "Italiano").boundingBox();
    expect(italiano!.x).toBeGreaterThan(name!.x + name!.width - 1);
    expect(Math.abs(italiano!.y + italiano!.height / 2 - (name!.y + name!.height / 2))).toBeLessThan(25);
  });

  test("FLAG-4 inglese: tutti i menu e i testi passano in inglese", async ({ page }) => {
    const check = watchErrors(page);
    await flag(page, "English").click();
    await expect(flag(page, "English")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
    await expect(page.getByText("Press “Speak” and start talking.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Speak" }).last()).toBeVisible();
    await expect(page.getByRole("toolbar").getByRole("button", { name: "Bold" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Document" })).toBeVisible();
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByRole("dialog")).toContainText("Download the document");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Help" }).click();
    await expect(page.getByRole("dialog")).toContainText("Voice commands");
    check();
  });

  test("FLAG-5 francese e spagnolo", async ({ page }) => {
    await flag(page, "Français").click();
    await expect(page.getByRole("button", { name: "Réglages" })).toBeVisible();
    await expect(page.getByRole("toolbar").getByRole("button", { name: "Gras" })).toBeVisible();
    await page.getByRole("button", { name: "Aide" }).click();
    await expect(page.getByRole("dialog")).toContainText("Commandes vocales");
    await page.keyboard.press("Escape");
    await flag(page, "Español").click();
    await expect(page.getByRole("button", { name: "Ajustes" })).toBeVisible();
    await expect(page.getByRole("toolbar").getByRole("button", { name: "Negrita" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Exportar" })).toBeVisible();
  });

  test("FLAG-6 la bandierina cambia anche la lingua della voce e i comandi", async ({ page }) => {
    const doc = page.locator(".paper-stack .ProseMirror"); // il nome del campo cambia con la lingua
    await flag(page, "English").click();
    await expect(page.getByRole("toolbar").getByRole("combobox").first()).toHaveValue("en");
    await say(page, "hello comma how are you question mark");
    await expect(doc).toHaveText("Hello, how are you?");
    await flag(page, "Español").click();
    await say(page, "signo de apertura de interrogación cómo estás signo de interrogación");
    await expect(doc).toContainText("¿Cómo estás?");
  });

  test("FLAG-7 la scelta resta dopo il ricaricamento", async ({ page }) => {
    await flag(page, "Français").click();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByRole("button", { name: "Réglages" })).toBeVisible();
    await expect(flag(page, "Français")).toHaveAttribute("aria-pressed", "true");
  });

  test("FLAG-8 si può comunque dettare in una lingua diversa da quella dei menu (menu a tendina della barra)", async ({ page }) => {
    await flag(page, "Italiano").click();
    await page.getByRole("toolbar").getByRole("combobox").first().selectOption("en");
    await expect(page.getByRole("button", { name: "Impostazioni" })).toBeVisible(); // i menu restano in italiano
    await say(page, "hello comma world");
    await expect(editor(page)).toHaveText("Hello, world");
  });

  test("FLAG-9 anche l'elenco dei comandi e le impostazioni seguono la lingua", async ({ page }) => {
    await flag(page, "English").click();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("dialog")).toContainText("Who listens to your voice");
    await expect(page.getByRole("dialog")).toContainText("Personal dictionary");
  });

  test("FLAG-10 le bandierine si possono usare con la tastiera", async ({ page }) => {
    await flag(page, "English").focus();
    await page.keyboard.press("Enter");
    await expect(flag(page, "English")).toHaveAttribute("aria-pressed", "true");
  });

  test("FLAG-11 la pagina non esce dallo schermo", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
