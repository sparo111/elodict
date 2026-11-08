// Schema dei dati salvati nel browser (IndexedDB tramite Dexie).
// Non esiste un database server: tutto resta sul dispositivo dell'utente.

export type Lang = "en" | "it" | "fr" | "es";

export interface DocumentRow {
  id: string;            // uuid generato nel browser
  title: string;
  content: unknown;      // JSON del documento TipTap
  language: Lang;        // lingua di dettatura usata
  createdAt: number;     // ms epoch (UTC)
  updatedAt: number;     // ms epoch (UTC)
}

export interface SettingsRow {
  id: "main";            // una sola riga
  dictationLanguage: Lang;
  uiLanguage: Lang;
  microphoneId: string | null;
  autoPunctuation: boolean;
  profanityFilter: boolean;
  lastDocumentId: string | null;
}

export type CommandAction =
  | { type: "insertText"; text: string }
  | { type: "newLine" }
  | { type: "newParagraph" }
  | { type: "undo" }
  | { type: "deleteLast"; unit: "char" | "word" | "sentence" | "paragraph"; n: number }
  | { type: "select"; unit: "word" | "sentence" | "paragraph" | "last" }
  | { type: "format"; mark: "bold" | "italic" | "underline" | "strike" | "uppercase" | "lowercase" }
  | { type: "list"; kind: "bullet" | "number" }
  | { type: "pause" | "resume" | "stop" | "showHelp" };

// File commands/{en,it,fr,es}.json: elenco di questi oggetti.
export interface CommandEntry {
  phrase: string[];      // varianti pronunciabili
  category: "punctuation" | "symbols" | "math" | "currency" | "emoji" | "edit" | "select" | "format" | "list" | "control";
  action: CommandAction;
}

// Indici Dexie:
//   documents: "id, updatedAt"
//   settings:  "id"
