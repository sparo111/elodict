// Comandi vocali in italiano (M1: punteggiatura e a capo).
// Le frasi sono quelle che si dicono a voce; le varianti sono alternative equivalenti.
import type { CommandDef } from "./types";

export const itCommands: CommandDef[] = [
  { phrases: ["punto e virgola"], action: { type: "punct", char: ";" } },
  { phrases: ["punto interrogativo", "punto di domanda"], action: { type: "punct", char: "?" } },
  { phrases: ["punto esclamativo"], action: { type: "punct", char: "!" } },
  { phrases: ["puntini di sospensione"], action: { type: "punct", char: "…" } },
  { phrases: ["due punti"], action: { type: "punct", char: ":" } },
  { phrases: ["virgola"], action: { type: "punct", char: "," } },
  { phrases: ["punto"], action: { type: "punct", char: "." } },
  { phrases: ["nuovo paragrafo"], action: { type: "break", paragraph: true } },
  { phrases: ["a capo", "nuova riga"], action: { type: "break", paragraph: false } },
];
