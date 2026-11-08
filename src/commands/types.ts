export type Lang = "it" | "en" | "fr" | "es";
export type EditOp = "undo" | "deleteWord" | "deleteSentence" | "deleteRange";
export type FormatMark = "bold" | "italic" | "underline" | "clear";
export type FormatTarget = "that" | "word" | "sentence";

export type EditAction = { type: "edit"; op: EditOp; n?: number; from?: string; to?: string };
export type FormatAction = { type: "format"; mark: FormatMark; target: FormatTarget };
export type ControlAction = { type: "control"; op: "pause" | "resume" | "stop" };

export type CommandAction =
  /** segno che si attacca alla parola prima (. , ? ! : ; % °) */
  | { type: "punct"; char: string; spaceBefore?: boolean }
  /** segno che si attacca alla parola dopo (¿ ¡ ( « ) */
  | { type: "open"; char: string }
  /** segno di chiusura ) » */
  | { type: "close"; char: string }
  /** simbolo staccato come una parola (@ € & …) */
  | { type: "symbol"; char: string }
  | { type: "break"; paragraph: boolean }
  | EditAction
  | FormatAction
  | ControlAction;

export interface CommandDef {
  phrases: string[];
  action: CommandAction;
}

export type Token = { kind: "word"; text: string } | { kind: "cmd"; action: CommandAction };

/** Quello che l'editor deve inserire. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "break"; paragraph: boolean };

/** Una frase si divide in blocchi di testo e azioni sul testo già scritto. */
export type Step = { kind: "run"; tokens: Token[] } | { kind: "act"; action: EditAction | FormatAction | ControlAction };
