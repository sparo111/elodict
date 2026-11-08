// Comandi vocali in italiano. I comandi di modifica (annulla, cancella) sono nostri.
import type { CommandDef } from "./types";

export const itCommands: CommandDef[] = [
  { phrases: ["punto e virgola"], action: { type: "punct", char: ";" } },
  { phrases: ["punto interrogativo", "punto di domanda"], action: { type: "punct", char: "?" } },
  { phrases: ["punto esclamativo"], action: { type: "punct", char: "!" } },
  { phrases: ["puntini di sospensione"], action: { type: "punct", char: "…" } },
  { phrases: ["due punti"], action: { type: "punct", char: ":" } },
  { phrases: ["virgola"], action: { type: "punct", char: "," } },
  { phrases: ["punto"], action: { type: "punct", char: "." } },
  { phrases: ["parentesi aperta", "apri parentesi"], action: { type: "open", char: "(" } },
  { phrases: ["parentesi chiusa", "chiudi parentesi"], action: { type: "close", char: ")" } },
  { phrases: ["virgolette aperte", "apri virgolette"], action: { type: "open", char: "«" } },
  { phrases: ["virgolette chiuse", "chiudi virgolette"], action: { type: "close", char: "»" } },
  { phrases: ["nuovo paragrafo"], action: { type: "break", paragraph: true } },
  { phrases: ["a capo", "nuova riga"], action: { type: "break", paragraph: false } },
  { phrases: ["annulla"], action: { type: "edit", op: "undo" } },
  { phrases: ["cancella parola"], action: { type: "edit", op: "deleteWord" } },
  { phrases: ["cancella frase"], action: { type: "edit", op: "deleteSentence" } },
];
