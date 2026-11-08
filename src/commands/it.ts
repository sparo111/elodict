// Comandi vocali in italiano. I comandi di modifica e formattazione sono nostri.
import { formatCommands } from "./format";
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
  // simboli
  { phrases: ["a commerciale", "chiocciola"], action: { type: "symbol", char: "@" } },
  { phrases: ["asterisco"], action: { type: "symbol", char: "*" } },
  { phrases: ["e commerciale"], action: { type: "symbol", char: "&" } },
  { phrases: ["cancelletto", "hashtag"], action: { type: "symbol", char: "#" } },
  { phrases: ["segno di percentuale", "per cento"], action: { type: "punct", char: "%" } },
  { phrases: ["simbolo di grado"], action: { type: "punct", char: "°" } },
  { phrases: ["segno più"], action: { type: "symbol", char: "+" } },
  { phrases: ["segno meno"], action: { type: "symbol", char: "-" } },
  { phrases: ["segno di moltiplicazione"], action: { type: "symbol", char: "×" } },
  { phrases: ["segno di divisione"], action: { type: "symbol", char: "÷" } },
  { phrases: ["segno di uguale"], action: { type: "symbol", char: "=" } },
  { phrases: ["simbolo di dollaro"], action: { type: "symbol", char: "$" } },
  { phrases: ["simbolo di sterlina"], action: { type: "symbol", char: "£" } },
  { phrases: ["simbolo di euro"], action: { type: "symbol", char: "€" } },
  { phrases: ["simbolo di yen"], action: { type: "symbol", char: "¥" } },
  { phrases: ["underscore"], action: { type: "symbol", char: "_" } },
  { phrases: ["barra obliqua"], action: { type: "symbol", char: "/" } },
  // righe e modifica
  { phrases: ["nuovo paragrafo"], action: { type: "break", paragraph: true } },
  { phrases: ["a capo", "nuova riga"], action: { type: "break", paragraph: false } },
  { phrases: ["annulla"], action: { type: "edit", op: "undo" } },
  { phrases: ["cancella parola"], action: { type: "edit", op: "deleteWord" } },
  { phrases: ["cancella frase"], action: { type: "edit", op: "deleteSentence" } },
  ...formatCommands(
    { bold: ["grassetto"], italic: ["corsivo"], underline: ["sottolineato"], clear: ["rimuovi formattazione"] },
    { that: ["questo"], word: ["ultima parola"], sentence: ["ultima frase"] },
  ),
];
