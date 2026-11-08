import { expect, test } from "@playwright/test";
import { editor } from "./helpers";

// Versione pubblicata in una sottocartella (come su GitHub Pages: /elodict/). Porta 5201.
const ORIGIN = "http://localhost:5201";
const DONE = { cookies: [], origins: [{ origin: ORIGIN, localStorage: [{ name: "elodict-onboarding", value: "done" }] }] };

test.use({ storageState: DONE });

test("sotto /elodict/ l'app, il manifest e i file del motore si trovano", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${ORIGIN}/elodict/`);
  await expect(editor(page)).toBeVisible();

  const m = await (await request.get(`${ORIGIN}/elodict/manifest.webmanifest`)).json();
  expect(m.start_url).toBe("/elodict/");
  expect(m.scope).toBe("/elodict/");
  for (const icon of m.icons) expect((await request.get(`${ORIGIN}${icon.src.startsWith("/") ? "" : "/elodict/"}${icon.src}`)).ok(), icon.src).toBe(true);

  // i file del motore vocale sono raggiungibili con il percorso della sottocartella...
  for (const f of ["ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.wasm"]) {
    const r = await request.get(`${ORIGIN}/elodict/ort/${f}`);
    expect(r.ok(), f).toBe(true);
    expect(r.headers()["content-type"]).toContain("wasm");
  }
  // ...e NON alla radice (dove la pubblicazione in sottocartella non li metterebbe)
  expect((await request.get(`${ORIGIN}/ort/ort-wasm-simd-threaded.wasm`)).status()).toBe(404);
  expect(errors).toEqual([]);
});
