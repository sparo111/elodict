export type CommandAction =
  | { type: "punct"; char: string }
  | { type: "break"; paragraph: boolean };

export interface CommandDef {
  phrases: string[];
  action: CommandAction;
}

/** Quello che esce dall'analisi di una frase detta a voce. */
export type Token =
  | { kind: "word"; text: string }
  | { kind: "punct"; char: string }
  | { kind: "break"; paragraph: boolean };

/** Quello che l'editor deve inserire. */
export type Segment =
  | { kind: "text"; text: string }
  | { kind: "break"; paragraph: boolean };
