import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { editor, say } from "./helpers";

/**
 * Prove sul sito PUBBLICATO (o sulla sua anteprima), non sul server di sviluppo.
 *   SITE_URL=http://localhost:5230/elodict/ npx playwright test --project=sito-pubblicato
 *   SITE_URL=https://sparo111.github.io/elodict/ npx playwright test --project=sito-pubblicato
 * Senza SITE_URL le prove si saltano.
 */
const RAW = process.env.SITE_URL ?? "";
const SITE = RAW ? RAW.replace(/\/?$/, "/") : "";
const ORIGIN = SITE ? new URL(SITE).origin : "";
const BASE_PATH = SITE ? new URL(SITE).pathname : "/"; // per esempio /elodict/

test.skip(!SITE, "serve SITE_URL (l'indirizzo del sito da provare)");
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  // primo avvio già fatto: qui si prova il sito, non la procedura guidata (che ha le sue prove)
  await context.addInitScript(() => {
    try {
      localStorage.setItem("elodict-onboarding", "done");
      localStorage.setItem("elodict-install-banner", "dismissed");
    } catch (e) {
      console.warn("memoria locale non disponibile", e);
    }
  });
});

test("PUB-1 la pagina risponde 200 e l'app parte senza errori; «Prova senza microfono» scrive nel foglio", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const res = await page.goto(SITE);
  expect(res?.status()).toBe(200);
  await expect(editor(page)).toBeVisible();
  await say(page, "prova dal sito pubblicato punto");
  await expect(editor(page)).toHaveText("Prova dal sito pubblicato.");
  expect(errors).toEqual([]);
});

test("PUB-2 «Come si installa» si apre, in 4 lingue, con dedica e «Cos'è Elodict», e senza errori di accessibilità", async ({ page }) => {
  const res = await page.goto(`${SITE}installa.html`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Come installare Elodict");
  await expect(page.getByRole("heading", { name: "Cos'è Elodict" })).toBeVisible();
  await expect(page.getByText("Creata per Mimma", { exact: false })).toBeVisible();
  for (const [lang, title] of [["en", "How to install Elodict"], ["fr", "Comment installer Elodict"], ["es", "Cómo instalar Elodict"]]) {
    await page.goto(`${SITE}installa.html?lang=${lang}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("PUB-3 il manifest è valido e punta al percorso giusto; le icone ci sono", async ({ page, request }) => {
  await page.goto(SITE);
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const res = await request.get(new URL(href!, SITE).toString());
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBe("Elodict");
  expect(m.display).toBe("standalone");
  expect(new URL(m.start_url, SITE).pathname).toBe(BASE_PATH);
  expect(new URL(m.scope, SITE).pathname).toBe(BASE_PATH);
  for (const icon of m.icons) expect((await request.get(new URL(icon.src, SITE).toString())).status(), icon.src).toBe(200);
});

test("PUB-4 il programma di salvataggio offline (service worker) si registra, con il percorso giusto", async ({ page }) => {
  await page.goto(SITE);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(scope).pathname).toBe(BASE_PATH);
  expect((await page.request.get(`${SITE}sw.js`)).status()).toBe(200);
});

test("PUB-5 i file del motore vocale (ort) sono sotto il percorso del sito e non alla radice", async ({ request }) => {
  for (const f of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.jsep.wasm"]) {
    const r = await request.get(`${SITE}ort/${f}`);
    expect(r.status(), f).toBe(200);
    expect(r.headers()["content-type"], f).toContain("wasm");
  }
  if (BASE_PATH !== "/") expect((await request.get(`${ORIGIN}/ort/ort-wasm-simd-threaded.wasm`)).status()).not.toBe(200);
});

test("PUB-6 dopo la prima apertura l'app si riapre senza internet", async ({ page, context }) => {
  await page.goto(SITE);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(editor(page)).toBeVisible();
  await say(page, "senza internet punto");
  await expect(editor(page)).toHaveText("Senza internet.");
  await context.setOffline(false);
});

test("PUB-7 in Impostazioni c'è il collegamento al codice sorgente e la dedica", async ({ page }) => {
  await page.goto(SITE);
  await page.getByRole("button", { name: "Impostazioni" }).click();
  const link = page.getByRole("dialog").getByRole("link", { name: "Codice sorgente (licenza AGPL-3.0)" });
  await expect(link).toHaveAttribute("href", "https://github.com/sparo111/elodict");
  await expect(page.getByRole("dialog")).toContainText("Creata per Mimma");
});

test("PUB-8 con Whisper vero, il motore (ort) viene chiesto dal percorso del sito e mai dalla radice", async ({ page }) => {
  test.setTimeout(240_000);
  const hf = await fetch("https://huggingface.co/Xenova/whisper-tiny/resolve/main/config.json", { method: "HEAD", signal: AbortSignal.timeout(15_000) }).then((r) => r.ok, () => false);
  test.skip(!hf, "huggingface.co non raggiungibile da questo computer");
  const asked: string[] = [];
  page.on("request", (r) => r.url().includes("/ort/") && asked.push(r.url()));
  await page.goto(SITE);
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByLabel(/Offline nel browser, con Whisper/).check();
  await page.getByLabel("Modello offline").selectOption("tiny");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Detta/ }).last().click();
  await expect(page.getByRole("status").filter({ hasText: /^Ti ascolto/ })).toBeVisible({ timeout: 200_000 });
  expect(asked.length, "il motore deve essere stato chiesto").toBeGreaterThan(0);
  for (const u of asked) expect(u.startsWith(`${SITE}ort/`), u).toBe(true);
  await page.getByRole("button", { name: /^Ferma/ }).last().click();
});
