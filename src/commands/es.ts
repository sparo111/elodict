// Comandos de voz en español (tabla de Microsoft leída solo de un resumen: revisar con un hablante nativo).
import type { CommandDef } from "./types";

export const esCommands: CommandDef[] = [
  { phrases: ["signo de apertura de interrogación", "abrir interrogación"], action: { type: "open", char: "¿" } },
  { phrases: ["signo de interrogación", "cerrar interrogación"], action: { type: "punct", char: "?" } },
  { phrases: ["signo de apertura de exclamación", "abrir exclamación"], action: { type: "open", char: "¡" } },
  { phrases: ["signo de exclamación", "cerrar exclamación"], action: { type: "punct", char: "!" } },
  { phrases: ["punto y coma"], action: { type: "punct", char: ";" } },
  { phrases: ["dos puntos"], action: { type: "punct", char: ":" } },
  { phrases: ["puntos suspensivos"], action: { type: "punct", char: "…" } },
  { phrases: ["coma"], action: { type: "punct", char: "," } },
  { phrases: ["punto"], action: { type: "punct", char: "." } },
  { phrases: ["abrir paréntesis", "paréntesis de apertura"], action: { type: "open", char: "(" } },
  { phrases: ["cerrar paréntesis", "paréntesis de cierre"], action: { type: "close", char: ")" } },
  { phrases: ["abrir comillas", "comillas izquierdas"], action: { type: "open", char: "«" } },
  { phrases: ["cerrar comillas", "comillas derechas"], action: { type: "close", char: "»" } },
  { phrases: ["nuevo párrafo"], action: { type: "break", paragraph: true } },
  { phrases: ["nueva línea", "salto de línea"], action: { type: "break", paragraph: false } },
  { phrases: ["deshacer"], action: { type: "edit", op: "undo" } },
  { phrases: ["borra palabra"], action: { type: "edit", op: "deleteWord" } },
  { phrases: ["borra frase"], action: { type: "edit", op: "deleteSentence" } },
];
