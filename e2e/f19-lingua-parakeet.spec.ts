import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * T013d: Parakeet riconosce la lingua da solo. Si fanno trascrivere registrazioni in italiano e inglese (voci vere di Windows per quelle
 * lingue) e due prove di STRESS in francese e spagnolo (Windows qui non ha voci per quelle lingue: sono lette da una voce italiana, quindi
 * con accento italiano). Si guarda in che lingua esce il testo. Usa la funzione di prova window.__elodictTranscribe (solo build di prova).
 */
const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const have = (f: string) => fs.existsSync(path.join(FIX, f));

/** WAV a 16 bit, mono, 16 kHz → numeri da -1 a 1 */
function samples(file: string): number[] {
  const b = fs.readFileSync(path.join(FIX, file));
  const out: number[] = [];
  for (let i = 44; i + 1 < b.length; i += 2) out.push(b.readInt16LE(i) / 32768);
  return out;
}

const STOP: Record<string, string[]> = {
  it: ["il", "la", "di", "che", "è", "una", "un", "per", "con", "non", "ciao", "tutti", "questa", "della", "devo", "poi", "andiamo", "mattina", "domani"],
  en: ["the", "is", "this", "of", "to", "and", "we", "are", "hello", "test", "take", "have", "then", "going", "morning", "tomorrow", "car", "for"],
  fr: ["le", "la", "je", "une", "pour", "bonjour", "voudrais", "réserver", "deux", "personnes", "demain", "après-midi", "est", "les", "des", "du"],
  es: ["el", "la", "una", "para", "buenos", "días", "quisiera", "reservar", "mesa", "dos", "personas", "mañana", "tarde", "los", "por", "con"],
};
/** La lingua in cui «sembra» scritto un testo (parole molto comuni di ognuna); null se non si capisce. */
function guess(text: string): string | null {
  const words = text.toLowerCase().replace(/[.,;:!?¿¡"«»]/g, " ").split(/\s+/).filter(Boolean);
  const score = Object.fromEntries(Object.entries(STOP).map(([l, w]) => [l, words.filter((x) => w.includes(x)).length]));
  const best = Object.entries(score).sort((a, b) => b[1] - a[1]);
  return best[0][1] > 0 && best[0][1] > best[1][1] ? best[0][0] : null;
}

async function transcribe(page: Page, engine: "offline" | "parakeet", file: string, lang: string): Promise<string> {
  return page.evaluate(
    async ([arr, e, l]) => (window as unknown as { __elodictTranscribe: (e: string, s: Float32Array, l: string) => Promise<string> }).__elodictTranscribe(e as string, new Float32Array(arr as number[]), l as string),
    [samples(file), engine, lang],
  );
}

test.describe.serial("Parakeet: la lingua", () => {
  let page: Page;
  const results: string[] = [];

  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "una volta basta, sul desktop (scarica ~200 MB)");
  });
  test.beforeAll(async ({ browser }, info) => {
    if (info.project.name !== "desktop") return;
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [{ origin: "http://localhost:5199", localStorage: [{ name: "elodict-onboarding", value: "done" }, { name: "elodict-install-banner", value: "dismissed" }] }] } });
    page = await ctx.newPage();
    await page.goto("/");
    await page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).__elodictTranscribe === "function");
  });
  test.afterAll(() => console.log("LINGUA — risultati:\n" + results.join("\n")));

  for (const [file, lang, real] of [
    ["speech-it.wav", "it", true],
    ["speech-it2.wav", "it", true],
    ["speech-en.wav", "en", true],
    ["speech-en2.wav", "en", true],
    ["speech-es-da-it.wav", "es", false],
    ["speech-fr-da-it.wav", "fr", false],
  ] as const) {
    test(`${file}: ${real ? "lingua vera" : "STRESS (voce italiana che legge un testo " + lang + ")"}`, async () => {
      test.setTimeout(600_000);
      test.skip(!have(file), "mancano le registrazioni: esegui e2e/make-fixtures.ps1");
      const text = await transcribe(page, "parakeet", file, lang);
      const g = guess(text);
      results.push(`${file} (attesa ${lang}${real ? "" : ", stress"}) → riconosciuta ${g ?? "?"}: «${text}»`);
      expect(text.length).toBeGreaterThan(5);
      if (real) expect(g, `«${text}» dovrebbe essere in ${lang}`).toBe(lang);
    });
  }
});
