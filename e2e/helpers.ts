import { expect, type Page } from "@playwright/test";

/** Ogni test fallisce se la pagina scrive errori nella console o crea eccezioni. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return () => expect(errors, "errori nella pagina").toEqual([]);
}

/**
 * Finto riconoscimento vocale: permette di provare il tasto microfono senza microfono.
 * Il test può "far parlare" l'app con window.__say("testo") e simulare errori con window.__fail("not-allowed").
 */
export const FAKE_SPEECH = `
(() => {
  let current = null;
  class FakeRec {
    constructor() { this.lang = ""; this.continuous = false; this.interimResults = false; this.running = false; current = this; window.__recLang = this.lang; }
    start() {
      if (this.running) throw new Error("already started");
      this.running = true; window.__starts = (window.__starts || 0) + 1; window.__recLang = this.lang;
      setTimeout(() => this.onstart && this.onstart(), 0);
    }
    stop() { this.running = false; setTimeout(() => this.onend && this.onend(), 0); }
  }
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
  const result = (text, isFinal) => ({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] });
  window.__say = (text) => current.onresult(result(text, true));
  window.__interim = (text) => current.onresult(result(text, false));
  window.__fail = (code) => { current.running = false; current.onerror({ error: code }); current.onend(); };
  window.__browserStop = () => { current.running = false; current.onend(); };
})();
`;

/** Toglie il "Salva con nome" di Chrome così i test possono provare lo scaricamento normale. */
export const NO_PICKER = `delete window.showSaveFilePicker;`;

export const editor = (page: Page) => page.getByRole("textbox", { name: "Documento" });

export async function say(page: Page, text: string) {
  if (!(await page.locator("#try").isVisible())) {
    await page.getByText(/Prova senza microfono|Try without a microphone|Essayer sans micro|Probar sin micrófono/).click();
  }
  await page.locator("#try").fill(text);
  await page.locator("#try").press("Enter");
}

export async function setLanguage(page: Page, which: "dictation" | "ui", value: string) {
  await page.getByRole("button", { name: /Impostazioni|Settings|Réglages|Ajustes/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").nth(which === "dictation" ? 0 : 1).selectOption(value);
  await page.keyboard.press("Escape");
}

/**
 * Testo selezionato sullo schermo. L'editor prende il focus (e quindi mostra la selezione) un frame dopo il comando:
 * si aspetta quel segnale preciso invece di leggere subito (BUG-006).
 */
export async function selectedText(page: Page) {
  await expect(editor(page)).toBeFocused();
  return page.evaluate(() => window.getSelection()?.toString() ?? "");
}

