import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * T013c: la pagina di prova (prova-parakeet/) sa dire DOVE si ferma, ha un tempo massimo per fase, riporta tutti gli errori e ha il
 * pulsante «Prova solo Parakeet piccolo». Si prova con WebKit e il profilo iPhone 15 (progetto «prova-webkit») e con il MOTORE FINTO
 * della pagina (?sim=finto,...): attraversa le stesse fasi dei motori veri, senza scaricare modelli, e si blocca o si rompe di proposito.
 *   PROVA_URL=http://localhost:5240/elodict/prova-parakeet/ npx playwright test --project=prova-webkit
 * Senza PROVA_URL le prove si saltano.
 */
const RAW = process.env.PROVA_URL ?? "";
const PAGE = RAW ? RAW.replace(/\/?$/, "/") : "";
test.skip(!PAGE, "serve PROVA_URL (l'indirizzo della pagina di prova)");

const url = (q: string) => `${PAGE}?${q}`;
const startAll = (page: Page) => page.getByRole("button", { name: "Avvia la prova" });
const startSmall = (page: Page) => page.getByRole("button", { name: "Prova solo Parakeet piccolo" });
const box = (page: Page) => page.locator("#copy-box").inputValue();
type J = { last: { engine: string; phase: string; at: string } | null; history: { phase: string; engine: string }[]; errors: string[]; finished: boolean };
const journal = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("prova-parakeet-diario") ?? "null") as J | null);
const rowsOf = (page: Page) => page.evaluate(() => (window as unknown as { __rows: { engine: string; ok: boolean; error?: string; errorPhase?: string; errors: string[]; logs: string[] }[] }).__rows);

test.describe("WebKit, iPhone 15", () => {
  test("1. il diario scrive la fase PRIMA di ognuna; se la pagina si ricarica nel mezzo, al riavvio c'è «Ultima prova interrotta a: …» e finisce in «Copia i risultati»", async ({ page }) => {
    await page.goto(url("sim=finto,lento"));
    await expect(startSmall(page)).toBeEnabled({ timeout: 60_000 });
    await startSmall(page).click();
    // la pagina è nella fase di scaricamento (finto, lento): il diario lo dice già
    await expect.poll(async () => (await journal(page))?.last?.phase ?? "", { timeout: 20_000 }).toContain("scaricamento file");
    const j = (await journal(page))!;
    expect(j.finished).toBe(false);
    expect(j.last!.engine).toBe("parakeet-olicorne-w2a8");
    expect(new Date(j.last!.at).getTime()).toBeGreaterThan(Date.now() - 60_000); // l'ora c'è
    // aspetta di essere più avanti (sessione), poi «Safari ricarica la pagina»
    await expect.poll(async () => (await journal(page))?.last?.phase ?? "", { timeout: 20_000 }).toContain("creazione della sessione");
    await page.reload();
    const banner = page.getByRole("region", { name: "Ultima prova interrotta" });
    await expect(banner).toBeVisible({ timeout: 60_000 });
    await expect(banner).toContainText("Ultima prova interrotta a: parakeet-olicorne-w2a8");
    await expect(banner).toContainText("creazione della sessione");
    await expect(banner).toContainText("aperta come: reload");
    // e il testo da copiare lo include, già prima di rifare la prova
    await expect(page.getByRole("button", { name: "Copia i risultati" })).toBeVisible();
    const text = await box(page);
    expect(text).toContain("== ULTIMA PROVA INTERROTTA ==");
    expect(text).toContain("Ultima prova interrotta a: parakeet-olicorne-w2a8");
    expect(text).toContain("creazione della sessione");
    // la banda è in cima: sopra il pulsante «Avvia la prova»
    expect((await banner.boundingBox())!.y).toBeLessThan((await startAll(page).boundingBox())!.y);
    // senza interruzione (prova finita) il banner non c'è: finisce una prova intera e si ricarica
    await page.goto(url("sim=finto"));
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    expect((await journal(page))!.finished).toBe(true);
    await page.reload();
    await expect(startSmall(page)).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator("#interrupted")).toBeHidden();
  });

  test("1b. la sequenza delle fasi nel diario: scaricamento file N di M, sessione, preparazione audio, encoder, decoder, frase N", async ({ page }) => {
    await page.goto(url("sim=finto"));
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    const phases = (await journal(page))!.history.map((h) => h.phase);
    const at = (needle: string) => phases.findIndex((p) => p.includes(needle));
    for (const needle of ["scaricamento file 1 di 3", "scaricamento file 3 di 3", "creazione della sessione", "preparazione dell'audio (finta)", "encoder (finto)", "decoder (finto)", "frase 1/5"]) expect(at(needle), needle).toBeGreaterThanOrEqual(0);
    expect(at("scaricamento file 1 di 3")).toBeLessThan(at("creazione della sessione"));
    expect(at("creazione della sessione")).toBeLessThan(at("encoder (finto)"));
    expect(at("preparazione dell'audio (finta)")).toBeLessThan(at("encoder (finto)"));
    expect(at("encoder (finto)")).toBeLessThan(at("decoder (finto)"));
  });

  test("2. tempo massimo per fase: se scade la prova segna ERRORE con la fase e passa alla successiva, senza bloccare la pagina", async ({ page }) => {
    // sessione bloccata, limite 2 s: tutte le prove (Whisper e Parakeet) finiscono con ERRORE e la pagina arriva in fondo
    await page.goto(url("sim=finto,hang-session&t_session=2&t_download=2&t_run=2"));
    await expect(startAll(page)).toBeEnabled({ timeout: 60_000 });
    await startAll(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    let rows = await rowsOf(page);
    expect(rows.map((r) => r.engine)).toEqual(["whisper-base", "parakeet-olicorne-w2a8"]);
    for (const r of rows) {
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/tempo scaduto \(2 s/);
      expect(r.errorPhase).toContain("creazione della sessione");
    }
    await expect(page.locator("#tables")).toContainText("ERRORE (fase «creazione della sessione");
    // scaricamento bloccato: la fase nel messaggio è il file
    await page.goto(url("sim=finto,hang-download&t_download=2"));
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    rows = await rowsOf(page);
    expect(rows[0].errorPhase).toContain("scaricamento file 2 di 3");
    // frase bloccata
    await page.goto(url("sim=finto,hang-run&t_run=2"));
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    rows = await rowsOf(page);
    expect(rows[0].error).toMatch(/tempo scaduto \(2 s, limite per «frase»\)/);
    expect(rows[0].errorPhase).toContain("preparazione dell'audio");
    // la pagina è ancora viva: i pulsanti si possono premere di nuovo
    await expect(startSmall(page)).toBeEnabled();
    // i limiti di base sono quelli chiesti: scaricamento 10 min, sessione 2 min, frase 2 min
    await page.goto(url("sim=finto"));
    await expect(page.locator("#status")).toBeVisible();
  });

  test("3. errori del lavoratore (eccezione, promessa rifiutata, errore non gestito) e della pagina: tutti riportati con il messaggio completo", async ({ page }) => {
    await page.goto(url("sim=finto,throw,reject,crash"));
    await expect(startSmall(page)).toBeEnabled({ timeout: 60_000 });
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("errore della pagina simulato");
      }, 0);
      void Promise.reject(new Error("rifiuto della pagina simulato"));
    });
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    const rows = await rowsOf(page);
    const all = rows[0].errors.join("\n");
    expect(all).toContain("errore del lavoratore simulato (throw)");
    expect(all).toContain("promessa rifiutata simulata (reject)");
    expect(all).toContain("eccezione simulata (crash)");
    expect(rows[0].ok).toBe(false);
    const text = await box(page);
    expect(text).toContain("== Errori e messaggi (completi) ==");
    expect(text).toContain("eccezione simulata (crash)");
    expect(text).toContain("pagina: errore: ");
    expect(text).toContain("errore della pagina simulato");
    expect(text).toContain("rifiuto della pagina simulato");
    // gli stessi errori sono nel diario
    expect((await journal(page))!.errors.join("\n")).toContain("eccezione simulata (crash)");
  });

  test("3b. un errore VERO di onnxruntime (file del modello non validi) arriva con il messaggio completo e la fase", async ({ page, context }) => {
    // i file del modello vengono sostituiti da pochi byte: onnxruntime-web deve dire che non sono un modello
    await context.route("**/huggingface.co/**", (route) => {
      const u = route.request().url();
      if (u.endsWith("config.json")) return route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: '{"model_type":"nemo-conformer-tdt"}' });
      if (u.endsWith("vocab.txt")) return route.fulfill({ status: 200, contentType: "text/plain", headers: { "access-control-allow-origin": "*" }, body: "<unk> 0\na 1\n" });
      return route.fulfill({ status: 200, contentType: "application/octet-stream", headers: { "access-control-allow-origin": "*" }, body: "non è un modello onnx" });
    });
    await page.goto(url("t_session=30"));
    await expect(startSmall(page)).toBeEnabled({ timeout: 60_000 });
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 120_000 });
    const rows = await rowsOf(page);
    expect(rows[0].ok).toBe(false);
    expect(rows[0].errorPhase).toMatch(/creazione delle sessioni onnxruntime|scaricamento|configurazione/);
    expect((rows[0].error ?? "").length).toBeGreaterThan(20); // un messaggio vero, non «errore»
    console.log("errore vero di onnxruntime in WebKit:", rows[0].error);
    expect(await box(page)).toContain("ERRORE nella fase");
  });

  test("4. «Prova solo Parakeet piccolo» salta Whisper e le prove sulle pause; «Avvia la prova» invece le fa", async ({ page }) => {
    await page.goto(url("sim=finto"));
    await expect(startSmall(page)).toBeEnabled({ timeout: 60_000 });
    const b = (await startSmall(page).boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(48);
    await startSmall(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    let rows = await rowsOf(page);
    expect(rows.map((r) => r.engine)).toEqual(["parakeet-olicorne-w2a8"]);
    expect(await page.locator("#tables table").last().locator("tbody tr").count()).toBe(0); // niente prove sulle pause
    expect(await box(page)).not.toMatch(/silenceMs 400/);
    expect(await box(page)).not.toContain("whisper-base\t");
    // «Avvia la prova»: Whisper, Parakeet e le pause
    await startAll(page).click();
    await expect(page.locator("#status")).toContainText("Finito", { timeout: 60_000 });
    rows = await rowsOf(page);
    expect(rows.map((r) => r.engine)).toEqual(["whisper-base", "parakeet-olicorne-w2a8"]);
    expect(await page.locator("#tables table").last().locator("tbody tr").count()).toBe(3);
  });

  test("5. a 390 px, con il banner dell'interruzione, la pagina non ha errori di accessibilità né scorrimento orizzontale", async ({ page }) => {
    await page.goto(url("sim=finto,lento"));
    await startSmall(page).click();
    await expect.poll(async () => (await journal(page))?.last?.phase ?? "", { timeout: 20_000 }).toContain("scaricamento");
    await page.setViewportSize({ width: 390, height: 664 });
    await page.reload();
    await expect(page.locator("#interrupted")).toBeVisible({ timeout: 60_000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
