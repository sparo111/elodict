// Salvataggio nel browser (IndexedDB). Niente server: i dati restano sul dispositivo.
import Dexie, { type Table } from "dexie";
import type { Lang } from "../commands/types";

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
}

class AppDB extends Dexie {
  documents!: Table<DocumentRow, string>;
  settings!: Table<SettingsRow, string>;
  constructor() {
    super("mia-dictate");
    this.version(1).stores({ documents: "id, updatedAt", settings: "id" });
  }
}

const db = new AppDB();

export function defaultLang(): Lang {
  const l = (typeof navigator !== "undefined" ? navigator.language : "it").slice(0, 2);
  return l === "it" || l === "en" || l === "fr" || l === "es" ? l : "it";
}

export async function loadSettings(): Promise<SettingsRow> {
  const fallback: SettingsRow = { id: "main", dictationLanguage: defaultLang(), uiLanguage: defaultLang() };
  try {
    return (await db.settings.get("main")) ?? fallback;
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
