import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { editor, watchErrors } from "./helpers";

const DONE = { cookies: [], origins: [{ origin: "http://localhost:5200", localStorage: [{ name: "elodict-onboarding", value: "done" }] }] };
const FRESH = { cookies: [], origins: [] };

const UA_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const UA_FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0";

/** Aspetta che il «service worker» abbia preso il controllo della pagina. */
async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test.describe("versione installabile: file", () => {
  test.use({ storageState: DONE });

  test("il manifest è valido e le icone esistono", async ({ page, request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBe("Elodict");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    const sizes = m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? "any"}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
    for (const icon of m.icons) {
      const r = await request.get(icon.src);
      expect(r.ok(), icon.src).toBe(true);
      expect(r.headers()["content-type"]).toContain("image/png");
    }
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  });

  test("il service worker si registra e i file pesanti del motore non sono nella copia iniziale", async ({ page, request }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await controlled(page);
    const sw = await (await request.get("/sw.js")).text();
    // elenco della copia iniziale: nessun file .wasm né della cartella ort (si scaricano solo se servono)
    const precache = sw.slice(sw.indexOf("precacheAndRoute"), sw.indexOf("cleanupOutdatedCaches"));
    expect(precache).not.toMatch(/\.wasm|ort\//);
    expect(sw).toMatch(/CacheFirst/); // ...e vengono tenuti dopo il primo uso
    const keys = await page.evaluate(() => caches.keys());
    expect(keys.some((k) => k.includes("precache"))).toBe(true);
    errors();
  });

  test("la pagina «Come si installa» c'è, in 4 lingue, e sta in un foglio A4", async ({ page }) => {
    for (const [lang, title] of [
      ["it", "Come installare Elodict"],
      ["en", "How to install Elodict"],
      ["fr", "Comment installer Elodict"],
      ["es", "Cómo instalar Elodict"],
    ] as const) {
      await page.goto(`/installa.html?lang=${lang}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    }
  });

  test("«Come si installa» stampata occupa al massimo una pagina per lingua", async ({ page }) => {
    for (const lang of ["it", "en", "fr", "es"]) {
      await page.goto(`/installa.html?lang=${lang}`);
      const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
      const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      expect(pages, lang).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("senza internet", () => {
  test.use({ storageState: DONE });

  test("dopo la prima apertura l'app si riapre offline e si scrive nel foglio", async ({ page, context }) => {
    test.skip(test.info().project.name === "pwa-mobile", "stessa prova del desktop");
    await page.goto("/");
    await controlled(page);
    await context.setOffline(true);
    await page.reload();
    await expect(editor(page)).toBeVisible();
    await page.getByText("Prova senza microfono").click();
    await page.locator("#try").fill("Scrivo senza internet");
    await page.locator("#try").press("Enter");
    await expect(editor(page)).toContainText("Scrivo senza internet");
    await context.setOffline(false);
  });
});

test.describe("pulsante «Installa»", () => {
  test.use({ storageState: DONE });

  test("con l'invito del programma basta un clic", async ({ page }) => {
    await page.addInitScript(() => {
      const ev = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
      ev.prompt = async () => {
        (window as unknown as { __prompted: number }).__prompted = ((window as unknown as { __prompted?: number }).__prompted ?? 0) + 1;
      };
      ev.userChoice = Promise.resolve({ outcome: "accepted" });
      window.addEventListener("DOMContentLoaded", () => setTimeout(() => window.dispatchEvent(ev), 50));
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Installa Elodict" }).first().click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted?: number }).__prompted ?? 0)).toBe(1);
  });

  test("su iPhone (Safari) mostra i 3 passi", async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: UA_IPHONE, viewport: { width: 390, height: 844 }, storageState: DONE, baseURL: "http://localhost:5200" });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Installa Elodict" }).first().click();
    const dlg = page.getByRole("dialog", { name: "Aggiungi Elodict alla schermata Home" });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole("listitem")).toHaveCount(3);
    const axe = await new AxeBuilder({ page }).include("dialog[open]").analyze();
    expect(axe.violations).toEqual([]);
    await ctx.close();
  });

  test("su Firefox spiega che funziona lo stesso", async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent: UA_FIREFOX, storageState: DONE, baseURL: "http://localhost:5200" });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.getByRole("button", { name: "Installa Elodict" }).first().click();
    await expect(page.getByRole("dialog", { name: "Questo programma non può installare Elodict" })).toBeVisible();
    await ctx.close();
  });

  test("se è già installata il pulsante e l'avviso spariscono", async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) => (q.includes("display-mode: standalone") ? ({ ...real(q), matches: true } as MediaQueryList) : real(q));
    });
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Installa Elodict" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Metti Elodict sul tuo schermo" })).toHaveCount(0);
  });

  test("la prima volta c'è un avviso grande; «Non ora» lo toglie e resta il pulsante", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Metti Elodict sul tuo schermo" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Non ora" }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(banner).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Installa Elodict" })).toBeVisible();
  });
});

test.describe("primo avvio guidato", () => {
  test.use({ storageState: FRESH });

  test("completo: lingua, microfono, «Veloce», poi non ricompare", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    const dlg = page.getByRole("dialog", { name: "Che lingua parli?" });
    await expect(dlg).toBeVisible();
    const axe = await new AxeBuilder({ page }).include("dialog[open]").analyze();
    expect(axe.violations).toEqual([]);
    await dlg.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Consenti il microfono" }).click();
    await expect(page.getByText("Microfono pronto.")).toBeVisible();
    await page.getByRole("button", { name: "Avanti" }).click();
    await expect(page.getByRole("heading", { name: "Come vuoi che ascolti?" })).toBeVisible();
    await page.getByRole("button", { name: /Veloce/ }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(editor(page)).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Che lingua parli?" })).toHaveCount(0);
    errors();
  });

  test("si può saltare, e da Impostazioni si rifà", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Salta" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Che lingua parli?" })).toHaveCount(0);
    await page.getByRole("button", { name: "Impostazioni" }).click();
    await page.getByRole("button", { name: "Rifai la configurazione" }).click();
    await expect(page.getByRole("dialog", { name: "Che lingua parli?" })).toBeVisible();
  });

  test("la lingua scelta cambia i testi", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("dialog").getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Which language do you speak?" })).toBeVisible();
  });

  test("microfono rifiutato: spiega come riattivarlo e offre «Prova senza microfono»", async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("no", "NotAllowedError"));
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Avanti" }).click();
    await page.getByRole("button", { name: "Consenti il microfono" }).click();
    await expect(page.getByRole("alert")).toContainText("lucchetto");
    await page.getByRole("button", { name: "Prova senza microfono" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#try")).toBeFocused();
  });
});

test.describe("nuova versione", () => {
  test.use({ storageState: DONE });

  test("l'avviso compare e «Aggiorna» ricarica senza perdere il testo", async ({ page }) => {
    test.skip(test.info().project.name === "pwa-mobile", "stessa prova del desktop");
    test.setTimeout(90_000);
    await page.goto("/");
    await controlled(page);
    await editor(page).click();
    await page.keyboard.type("Testo da non perdere");

    // Simula una nuova versione: cambia il file del service worker sul disco della versione costruita.
    const fs = await import("node:fs");
    const file = "dist-pwa/sw.js";
    const original = fs.readFileSync(file, "utf8");
    try {
      fs.writeFileSync(file, `${original}\n/* nuova versione ${Date.now()} */\n`);
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      });
      const notice = page.getByText("È pronta una nuova versione.");
      await expect(notice).toBeVisible({ timeout: 30_000 });
      await editor(page).click();
      await page.keyboard.type(" e anche questo");
      await page.getByRole("button", { name: "Aggiorna" }).click();
      await page.waitForLoadState("load");
      await expect(editor(page)).toContainText("Testo da non perdere e anche questo", { timeout: 20_000 });
    } finally {
      fs.writeFileSync(file, original);
    }
  });
});
