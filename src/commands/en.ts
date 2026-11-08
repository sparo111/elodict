// English voice commands. The edit commands (undo, delete) are our own wording.
import type { CommandDef } from "./types";

export const enCommands: CommandDef[] = [
  { phrases: ["question mark"], action: { type: "punct", char: "?" } },
  { phrases: ["exclamation mark", "exclamation point"], action: { type: "punct", char: "!" } },
  { phrases: ["semicolon"], action: { type: "punct", char: ";" } },
  { phrases: ["colon"], action: { type: "punct", char: ":" } },
  { phrases: ["ellipsis"], action: { type: "punct", char: "…" } },
  { phrases: ["comma"], action: { type: "punct", char: "," } },
  { phrases: ["period", "full stop"], action: { type: "punct", char: "." } },
  { phrases: ["open parenthesis", "left parenthesis", "open parentheses", "left parentheses"], action: { type: "open", char: "(" } },
  { phrases: ["close parenthesis", "right parenthesis", "close parentheses", "right parentheses"], action: { type: "close", char: ")" } },
  { phrases: ["open quote", "open quotes"], action: { type: "open", char: "“" } },
  { phrases: ["close quote", "close quotes"], action: { type: "close", char: "”" } },
  { phrases: ["new paragraph"], action: { type: "break", paragraph: true } },
  { phrases: ["new line"], action: { type: "break", paragraph: false } },
  { phrases: ["undo"], action: { type: "edit", op: "undo" } },
  { phrases: ["delete word"], action: { type: "edit", op: "deleteWord" } },
  { phrases: ["delete sentence"], action: { type: "edit", op: "deleteSentence" } },
];
