// Salvataggio nel browser (IndexedDB). Niente server: i dati restano sul dispositivo.
import Dexie, { type Table } from "dexie";
import type { Lang } from "../commands/types";
import type { DictEntry } from "../text/clean";
import { buildBackup, stringifyBackup, type ParsedBackup } from "./backup";
import { emitDbEvent, runBeforeDbClose, subscribeDbEvents } from "./dbEvents";
import { migrateToV2 } from "./migrations";

export interface DocumentRow {
  id: string;
  title: string;
  content: unknown;   // JSON dell'editor
  language: Lang;
  createdAt: number;
  updatedAt: number;
  titleCustom?: boolean; // il nome l'ha scelto l'utente (altrimenti viene dalle prime parole)
  openedAt?: number;     // ultima volta che è stato aperto (serve a riaprire quello giusto)
  deletedAt?: number;    // se c'è, è nel cestino da questo momento
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
  microphoneId: string;    // microfono scelto (vuoto = quello predefinito del sistema)
}

class AppDB extends Dexie {
  documents!: Table<DocumentRow, string>;
  settings!: Table<SettingsRow, string>;
  constructor() {
    super("elodict");
    this.version(1).stores({ documents: "id, updatedAt", settings: "id" });
    // v2: elenco dei documenti e cestino (indice sulla data di eliminazione). I dati di prima restano com'erano.
    this.version(2).stores({ documents: "id, updatedAt, deletedAt", settings: "id" }).upgrade(migrateToV2);
  }
}

export const db = new AppDB();

// Un'altra scheda tiene aperto il database e impedisce l'aggiornamento: lo si dice (e si aspetta).
db.on("blocked", () => emitDbEvent("blocked"));
// Un'altra scheda vuole aggiornare o cancellare il database: prima si salva, poi lo si chiude (altrimenti l'altra scheda
// resta ferma per sempre) e si avvisa che questa va ricaricata. `false` = niente chiusura automatica di Dexie, la facciamo noi.
db.on("versionchange", () => {
  void (async () => {
    await runBeforeDbClose();
    db.close();
    emitDbEvent("stale");
  })();
  return false;
});

export type DbStatus = { ok: true } | { ok: false; error: string };

/** Il database si apre (e, se serve, si aggiorna)? Se no, non si tocca niente: i dati restano dove sono. */
export async function checkDatabase(): Promise<DbStatus> {
  let blocked = false;
  const off = subscribeDbEvents((e) => {
    if (e === "blocked") blocked = true;
  });
  try {
    await db.open();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    off();
    if (blocked) emitDbEvent("unblocked"); // l'attesa è finita (bene o male)
  }
}

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
    microphoneId: "",
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

/** Salva un documento. I campi che l'editor non conosce (ultima apertura, cestino) restano com'erano. */
export async function saveDocument(row: DocumentRow): Promise<boolean> {
  try {
    const previous = await db.documents.get(row.id);
    await db.documents.put({ ...previous, ...row });
    return true;
  } catch {
    return false;
  }
}

/** Tutti i documenti (non quelli nel cestino) e le impostazioni, come testo JSON pronto da scaricare. Lancia `BackupLimitError` se non ci stanno. */
export async function exportBackup(): Promise<string> {
  const [documents, settings] = await Promise.all([db.documents.toArray(), db.settings.get("main")]);
  return stringifyBackup(buildBackup(settings, documents.filter((d) => !d.deletedAt)));
}

/** Rimette nel browser i documenti e le impostazioni di una copia già controllata. I documenti con lo stesso id vengono sostituiti. */
export async function restoreBackup(parsed: ParsedBackup): Promise<number> {
  await db.transaction("rw", db.documents, db.settings, async () => {
    if (parsed.documents.length) await db.documents.bulkPut(parsed.documents);
    if (parsed.settings) await db.settings.put({ id: "main", ...parsed.settings });
  });
  return parsed.documents.length;
}
