// Salvataggio nel browser (IndexedDB). Niente server: i dati restano sul dispositivo.
import Dexie, { type Table } from "dexie";
import type { Lang } from "../commands/types";
import type { DictEntry } from "../text/clean";
import { buildBackup, type ParsedBackup } from "./backup";

export interface DocumentRow {
  id: string;
  title: string;
  content: unknown;   // JSON dell'editor
  language: Lang;
  createdAt: number;
  updatedAt: number;
}

export interface SettingsRow {
  id: "main";
  dictationLanguage: Lang;
  uiLanguage: Lang;
  cleanFillers: boolean;   // toglie "ehm", "uhm"
  cleanRepeats: boolean;   // toglie le parole ripetute di fila
  autoPeriod: boolean;     // aggiunge il punto dopo ogni pausa
  engine: "browser" | "offline"; // chi ascolta: il browser o il modello offline
  whisperModel: "tiny" | "base"; // quale modello offline
  dictionary: DictEntry[]; // dizionario personale
  onboardingDone: boolean; // il primo avvio guidato è stato fatto (o saltato)
}

class AppDB extends Dexie {
  documents!: Table<DocumentRow, string>;
  settings!: Table<SettingsRow, string>;
  constructor() {
    super("elodict");
    this.version(1).stores({ documents: "id, updatedAt", settings: "id" });
  }
}

const db = new AppDB();

export function defaultLang(): Lang {
  const l = (typeof navigator !== "undefined" ? navigator.language : "it").slice(0, 2);
  return l === "it" || l === "en" || l === "fr" || l === "es" ? l : "it";
}

export async function loadSettings(): Promise<SettingsRow> {
  const fallback: SettingsRow = {
    id: "main",
    dictationLanguage: defaultLang(),
    uiLanguage: defaultLang(),
    cleanFillers: true,
    cleanRepeats: false,
    autoPeriod: false,
    engine: "browser",
    whisperModel: "base",
    dictionary: [],
    onboardingDone: false,
  };
  try {
    // Le impostazioni salvate da versioni vecchie non hanno i campi nuovi: si completano.
    return { ...fallback, ...(await db.settings.get("main")) };
  } catch {
    return fallback;
  }
}

export async function saveSettings(s: SettingsRow): Promise<boolean> {
  try {
    await db.settings.put(s);
    return true;
  } catch {
    return false;
  }
}

export async function loadLastDocument(): Promise<DocumentRow | undefined> {
  try {
    return await db.documents.orderBy("updatedAt").last();
  } catch {
    return undefined;
  }
}

export async function saveDocument(row: DocumentRow): Promise<boolean> {
  try {
    await db.documents.put(row);
    return true;
  } catch {
    return false;
  }
}

/** Tutti i documenti e le impostazioni, come testo JSON pronto da scaricare. */
export async function exportBackup(): Promise<string> {
  const [documents, settings] = await Promise.all([db.documents.toArray(), db.settings.get("main")]);
  return JSON.stringify(buildBackup(settings, documents), null, 2);
}

/** Rimette nel browser i documenti e le impostazioni di una copia già controllata. I documenti con lo stesso id vengono sostituiti. */
export async function restoreBackup(parsed: ParsedBackup): Promise<number> {
  await db.transaction("rw", db.documents, db.settings, async () => {
    if (parsed.documents.length) await db.documents.bulkPut(parsed.documents);
    if (parsed.settings) await db.settings.put({ id: "main", ...parsed.settings });
  });
  return parsed.documents.length;
}
