export type Lang = "it" | "en" | "fr" | "es";
export type EditOp = "undo" | "deleteWord" | "deleteSentence";

export type CommandAction =
  /** segno che si attacca alla parola prima (. , ? ! : ;) */
  | { type: "punct"; char: string; spaceBefore?: boolean }
  /** segno che si attacca alla parola dopo (¿ ¡ ( « ) */
  | { type: "open"; char: string }
  /** segno di chiusura ) » */
  | { type: "close"; char: string }
  | { type: "break"; paragraph: boolean }
  | { type: "edit"; op: EditOp };

export interface CommandDef {
  phrases: string[];
  action: CommandAction;
}

export type Token = { kind: "word"; text: string } | { kind: "cmd"; action: CommandAction };

/** Quello che l'editor deve inserire. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "break"; paragraph: boolean };

/** Una frase si divide in blocchi di testo e comandi di modifica. */
export type Step = { kind: "run"; tokens: Token[] } | { kind: "edit"; op: EditOp };
