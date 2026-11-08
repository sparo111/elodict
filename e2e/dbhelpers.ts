import type { Page } from "@playwright/test";

/** Un documento e le impostazioni come li salva la versione attuale dell'app (database «elodict», versione 1). */
export const OLD_DOC = {
  id: "doc-vecchio",
  title: "Lettera al condominio",
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Gentili condomini, " }, { type: "text", marks: [{ type: "bold" }], text: "assemblea" }, { type: "text", text: " rinviata." }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "primo punto" }] }] }] },
    ],
  },
  language: "it",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_500_000,
};
export const OLD_SETTINGS = {
  id: "main",
  dictationLanguage: "fr",
  uiLanguage: "it",
  cleanFillers: false,
  cleanRepeats: true,
  autoPeriod: true,
  engine: "offline",
  whisperModel: "tiny",
  dictionary: [{ from: "elodic", to: "Elodict" }, { from: "mia", to: "Mimma" }],
  onboardingDone: true,
  microphoneId: "mic-b",
};

/**
 * Crea da zero un database «elodict» come lo lascia la versione attuale dell'app (versione 1 di Dexie = 10 di IndexedDB).
 * Va chiamata su una pagina che NON è l'app (per esempio installa.html), così l'app non lo tocca prima.
 */
export async function writeOldDatabase(page: Page, docs = [OLD_DOC], settings: unknown = OLD_SETTINGS) {
  await page.evaluate(
    ({ docs, settings }) =>
      new Promise<void>((resolve, reject) => {
        const del = indexedDB.deleteDatabase("elodict");
        del.onerror = () => reject(del.error);
        del.onsuccess = () => {
          const open = indexedDB.open("elodict", 10);
          open.onupgradeneeded = () => {
            const db = open.result;
            const d = db.createObjectStore("documents", { keyPath: "id" });
            d.createIndex("updatedAt", "updatedAt");
            db.createObjectStore("settings", { keyPath: "id" });
            for (const doc of docs) d.put(doc);
            if (settings) db.objectStore?.("settings");
          };
          open.onsuccess = () => {
            const db = open.result;
            if (!settings) {
              db.close();
              return resolve();
            }
            const tx = db.transaction("settings", "readwrite");
            tx.objectStore("settings").put(settings);
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
          open.onerror = () => reject(open.error);
        };
      }),
    { docs, settings },
  );
}

/** Legge «così com'è» tutto il contenuto del database (senza passare dall'app). */
export function readRawDatabase(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ version: number; documents: Record<string, unknown>[]; settings: Record<string, unknown>[] }>((resolve, reject) => {
        const open = indexedDB.open("elodict");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(["documents", "settings"]);
          const docs = tx.objectStore("documents").getAll();
          const sets = tx.objectStore("settings").getAll();
          tx.oncomplete = () => {
            const version = db.version;
            db.close();
            resolve({ version, documents: docs.result, settings: sets.result });
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** Un documento salvato, con poche parole, per le prove dell'elenco. */
export function makeDoc(id: string, title: string, text: string, updatedAt: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title,
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
    language: "it",
    createdAt: updatedAt,
    updatedAt,
    ...extra,
  };
}

/** Aggiunge documenti al database già creato dall'app (versione nuova). Poi la pagina va ricaricata. */
export function putDocuments(page: Page, docs: unknown[]) {
  return page.evaluate(
    (docs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("elodict");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("documents", "readwrite");
          for (const d of docs) tx.objectStore("documents").put(d);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    docs,
  );
}
