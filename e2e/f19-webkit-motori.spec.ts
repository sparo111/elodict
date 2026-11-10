import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T013d: i DUE riconoscitori (Whisper con onnxruntime-web 1.22, Parakeet con la 1.31) funzionano con WebKit, uno dopo l'altro nella stessa
 * pagina, senza ricaricare. Il WebKit di Playwright su Windows non ha microfono né AudioContext: si usa la funzione di prova
 * window.__elodictTranscribe (solo build di prova) con una registrazione, come per la pagina di prova. Progetto «app-webkit» (copia di prova, porta 5200).
 */
const WAV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "speech-it.wav");

test("WebKit: Whisper, poi Parakeet, poi di nuovo Whisper, nella stessa pagina e senza ricaricare", async ({ page }) => {
  test.skip(!fs.existsSync(WAV), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
  test.setTimeout(600_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const b = fs.readFileSync(WAV);
  const arr: number[] = [];
  for (let i = 44; i + 1 < b.length; i += 2) arr.push(b.readInt16LE(i) / 32768);
  await page.addInitScript(() => {
    try {
      localStorage.setItem("elodict-onboarding", "done");
    } catch { /* niente */ }
  });
  await page.goto("/");
  await page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).__elodictTranscribe === "function");
  const run = (engine: string) =>
    page.evaluate(
      async ([a, e]) => (window as unknown as { __elodictTranscribe: (e: string, s: Float32Array, l: string) => Promise<string> }).__elodictTranscribe(e as string, new Float32Array(a as number[]), "it"),
      [arr, engine],
    );
  const w1 = await run("offline");
  console.log(`[WebKit] Whisper tiny: «${w1}»`);
  expect(w1).toMatch(/ciao/i);
  const p1 = await run("parakeet");
  console.log(`[WebKit] Parakeet: «${p1}»`);
  expect(p1).toMatch(/ciao/i);
  expect(p1).toMatch(/\.$/);
  const w2 = await run("offline"); // di nuovo Whisper, dopo Parakeet
  expect(w2).toMatch(/ciao/i);
  expect(errors).toEqual([]);
});
