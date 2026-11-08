// Copia di sicurezza: un solo file JSON con tutti i documenti e le impostazioni.
// Questo file non usa il database: si può provare da solo con i test.
import { LANGS } from "../commands";
import type { Lang } from "../commands/types";
import { parseDictionary } from "../text/clean";
import type { DocumentRow, SettingsRow } from "./db";

export interface BackupFile {
  app: "elodict";
  version: 1;
  exportedAt: string;
  settings: Omit<SettingsRow, "id"> | null;
  documents: DocumentRow[];
}

export interface ParsedBackup {
  settings: Omit<SettingsRow, "id"> | null;
  documents: DocumentRow[];
}

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_DOCUMENTS = 200;

/** La copia di sicurezza non può contenere tutto: troppi documenti o troppo grande. Non si scrive un file che poi non si potrebbe rileggere. */
export class BackupLimitError extends Error {
  constructor(readonly reason: "too-many" | "too-big") {
    super(reason);
    this.name = "BackupLimitError";
  }
}
const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as string[]).includes(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function buildBackup(settings: SettingsRow | undefined, documents: DocumentRow[]): BackupFile {
  const { id: _id, ...rest } = settings ?? ({} as SettingsRow);
  void _id;
  return {
    app: "elodict",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settings ? rest : null,
    documents,
  };
}

/** Il testo del file di copia di sicurezza. Rispetta gli stessi limiti che si controllano in lettura. */
export function stringifyBackup(file: BackupFile): string {
  if (file.documents.length > MAX_BACKUP_DOCUMENTS) throw new BackupLimitError("too-many");
  const json = JSON.stringify(file, null, 2);
  if (json.length > MAX_BACKUP_BYTES) throw new BackupLimitError("too-big");
  return json;
}

/** Controlla un file di copia di sicurezza. Se qualcosa non torna, lancia un errore: non importa niente a metà. */
export function parseBackup(json: string): ParsedBackup {
  if (json.length > MAX_BACKUP_BYTES) throw new Error("troppo grande");
  const data: unknown = JSON.parse(json);
  if (!isObj(data) || data.app !== "elodict" || data.version !== 1 || !Array.isArray(data.documents)) {
    throw new Error("formato");
  }
  if (data.documents.length > MAX_BACKUP_DOCUMENTS) throw new Error("troppi documenti");

  const documents: DocumentRow[] = data.documents.map((d) => {
    if (
      !isObj(d) || typeof d.id !== "string" || !d.id || d.id.length > 100 ||
      typeof d.title !== "string" || d.title.length > 300 ||
      !isObj(d.content) || !isLang(d.language) ||
      typeof d.createdAt !== "number" || typeof d.updatedAt !== "number"
    ) {
      throw new Error("documento non valido");
    }
    const row: DocumentRow = { id: d.id, title: d.title, content: d.content, language: d.language, createdAt: d.createdAt, updatedAt: d.updatedAt };
    if (d.titleCustom === true) row.titleCustom = true; // un nome scelto dall'utente resta
    return row;
  });

  let settings: ParsedBackup["settings"] = null;
  if (data.settings !== null && data.settings !== undefined) {
    const s = data.settings;
    if (
      !isObj(s) || !isLang(s.dictationLanguage) || !isLang(s.uiLanguage) ||
      typeof s.cleanFillers !== "boolean" || typeof s.cleanRepeats !== "boolean" || !Array.isArray(s.dictionary)
    ) {
      throw new Error("impostazioni non valide");
    }
    settings = {
      dictationLanguage: s.dictationLanguage,
      uiLanguage: s.uiLanguage,
      cleanFillers: s.cleanFillers,
      cleanRepeats: s.cleanRepeats,
      autoPeriod: typeof s.autoPeriod === "boolean" ? s.autoPeriod : false,
      engine: s.engine === "offline" ? "offline" : "browser",
      whisperModel: s.whisperModel === "tiny" ? "tiny" : "base",
      onboardingDone: s.onboardingDone === true,
      microphoneId: typeof s.microphoneId === "string" && s.microphoneId.length <= 300 ? s.microphoneId : "",
      dictionary: parseDictionary(JSON.stringify(s.dictionary)),
    };
  }
  return { settings, documents };
}
