import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { editor } from "./helpers";

/** T001g: la nuova icona (design/icona-elodict.png) arriva davvero nel sito: manifest, misure, zona sicura «maskable», scheda, telefono. */
const PWA = "http://localhost:5200";
const BASE = "http://localhost:5201";
const DONE = (origin: string) => ({ cookies: [], origins: [{ origin, localStorage: [{ name: "elodict-onboarding", value: "done" }, { name: "elodict-install-banner", value: "dismissed" }] }] });
test.use({ storageState: DONE(PWA) });

/** Larghezza e altezza di un PNG, lette dall'intestazione del file. */
function pngSize(buf: Buffer): { w: number; h: number } {
  expect(buf.subarray(1, 4).toString("latin1"), "non è un PNG").toBe("PNG");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
async function getPng(request: APIRequestContext, url: string) {
  const res = await request.get(url);
  expect(res.status(), url).toBe(200);
  expect(res.headers()["content-type"], url).toContain("image/png");
  return pngSize(await res.body());
}

test.describe("icone dell'app", () => {
  test("il manifest è valido e ogni icona ha la misura dichiarata (sia alla radice sia sotto /elodict/)", async ({ request }) => {
    for (const [origin, prefix] of [[PWA, "/"], [BASE, "/elodict/"]] as const) {
      const res = await request.get(`${origin}${prefix}manifest.webmanifest`);
      expect(res.ok()).toBe(true);
      const m = await res.json();
      expect(m.name).toBe("Elodict");
      expect(m.start_url).toBe(prefix);
      // i colori del manifest restano quelli scelti apposta (token di design), non lo sfondo dell'icona
      expect(m.theme_color).toBe("#5b34c9");
      expect(m.background_color).toBe("#ffffff");
      const icons = m.icons as { src: string; sizes: string; type: string; purpose?: string }[];
      expect(icons.map((i) => `${i.sizes}${i.purpose ? ":" + i.purpose : ""}`).sort()).toEqual(["192x192", "512x512", "512x512:maskable"]);
      for (const i of icons) {
        const [w, h] = i.sizes.split("x").map(Number);
        expect(i.type).toBe("image/png");
        expect(await getPng(request, new URL(i.src, `${origin}${prefix}`).toString()), i.src).toEqual({ w, h });
      }
    }
  });

  test("apple-touch-icon 180x180 senza trasparenza; icone della scheda 32 e 48; collegate dall'app e da installa.html", async ({ page, request }) => {
    for (const path of ["/", "/installa.html"]) {
      await page.goto(`${PWA}${path}`);
      const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
      expect(await getPng(request, new URL(apple!, `${PWA}${path}`).toString())).toEqual({ w: 180, h: 180 });
      const links = page.locator('link[rel="icon"]');
      const found: Record<string, { w: number; h: number }> = {};
      for (let i = 0; i < (await links.count()); i++) {
        const sizes = (await links.nth(i).getAttribute("sizes"))!;
        found[sizes] = await getPng(request, new URL((await links.nth(i).getAttribute("href"))!, `${PWA}${path}`).toString());
      }
      expect(found).toEqual({ "32x32": { w: 32, h: 32 }, "48x48": { w: 48, h: 48 } });
    }
    // nessun pixel trasparente nell'icona dell'iPhone (altrimenti iOS la riempie di nero)
    await page.goto(`${PWA}/`);
    const minAlpha = await page.evaluate(async () => {
      const img = new Image();
      img.src = "/icons/apple-touch-icon.png";
      await img.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 180;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, 180, 180).data;
      let min = 255;
      for (let i = 3; i < d.length; i += 4) min = Math.min(min, d[i]);
      return min;
    });
    expect(minAlpha).toBe(255);
  });

  test("«maskable»: il disegno sta tutto dentro il cerchio dell'80% e lo sfondo azzurro arriva ai bordi", async ({ page }) => {
    await page.goto(`${PWA}/`);
    const r = await page.evaluate(async () => {
      const img = new Image();
      img.src = "/icons/icon-maskable-512.png";
      await img.decode();
      const S = img.naturalWidth;
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, S, S).data;
      const at = (x: number, y: number) => [d[(y * S + x) * 4], d[(y * S + x) * 4 + 1], d[(y * S + x) * 4 + 2], d[(y * S + x) * 4 + 3]];
      // «disegno» = non azzurro: lo sfondo ha il blu molto sopra il verde (251 contro 220); il verde e il bianco no
      let maxDist = 0, minX = S, maxX = 0, minY = S, maxY = 0, n = 0;
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const i = (y * S + x) * 4;
          if (d[i + 2] - d[i + 1] < 12) {
            n++;
            maxDist = Math.max(maxDist, Math.hypot(x + 0.5 - S / 2, y + 0.5 - S / 2));
            minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }
      return { S, maxDist, bbox: [minX, minY, maxX, maxY], n, corners: [at(2, 2), at(S - 3, 2), at(2, S - 3), at(S - 3, S - 3)] };
    });
    expect(r.S).toBe(512);
    expect(r.n).toBeGreaterThan(20_000); // il disegno c'è
    const radius = r.maxDist / (r.S / 2);
    console.log(`maskable: il disegno arriva a ${(radius * 100).toFixed(1)}% del raggio; riquadro ${r.bbox.join(",")}`);
    // zona sicura: cerchio con diametro l'80% del lato, cioè raggio 80% del raggio del quadrato
    expect(radius).toBeLessThanOrEqual(0.8);
    expect(radius).toBeGreaterThan(0.6); // e non è rimpicciolito inutilmente
    for (const [rr, gg, bb, a] of r.corners) {
      expect([a, Math.abs(rr - 166) <= 15, Math.abs(gg - 220) <= 15, Math.abs(bb - 251) <= 15]).toEqual([255, true, true, true]);
    }
  });

  test("il sorgente grande (design/) non è nel sito pubblicato", async ({ request }) => {
    for (const p of ["/design/icona-elodict.png", "/icone/sorgente/icona-elodict.png", "/icons/icona-elodict.png", "/favicon.svg"]) {
      const res = await request.get(`${PWA}${p}`);
      expect(res.headers()["content-type"] ?? "", p).not.toContain("image/");
    }
  });

  test("a 390 px l'app e «Come si installa» si aprono, senza scorrimento orizzontale e senza errori di accessibilità", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${PWA}/`);
    await expect(editor(page)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // con il service worker che controlla la pagina (come per chi ha già usato l'app), l'indirizzo con ?lang= deve aprire le istruzioni
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.goto(`${PWA}/installa.html?lang=it`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come installare Elodict");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
});
