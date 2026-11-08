export type Lang = "it" | "en" | "fr" | "es";
export type EditOp = "undo" | "deleteWord" | "deleteSentence" | "deleteRange";
export type FormatMark = "bold" | "italic" | "underline" | "clear" | "upper" | "lower";
export type FormatTarget = "that" | "word" | "sentence";

export type EditAction = { type: "edit"; op: EditOp; n?: number; from?: string; to?: string };
export type FormatAction = { type: "format"; mark: FormatMark; target: FormatTarget };
export type ControlAction =
  | { type: "control"; op: "pause" | "resume" | "stop" | "showHelp" }
  | { type: "control"; op: "switchLang"; lang: Lang };
export type ListAction = { type: "list"; kind: "bullet" | "ordered" | "exit" };
export type SelectAction = { type: "select"; target: "all" | "word" | "sentence" | "none" };

/** Azioni che agiscono sul testo già scritto o sull'app (non scrivono parole). */
export type ActAction = EditAction | FormatAction | ControlAction | ListAction | SelectAction;

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
  | ActAction;

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
export type Step = { kind: "run"; tokens: Token[] } | { kind: "act"; action: ActAction };
