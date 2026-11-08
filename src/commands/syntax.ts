// Comandi con numeri e parole libere: "cancella 3 parole", "cancella da X a Y".
// Frasi nostre (Microsoft ha questi comandi solo in inglese).
import type { CommandAction, Lang } from "./types";

export interface EditSyntax {
  verbs: string[];        // come inizia il comando (la più lunga vince)
  wordUnits: string[];
  sentenceUnits: string[];
  rangeFrom: string;      // "da" / "from"
  rangeTo: string;        // "a" / "to"
  numbers: Record<string, number>;
  examples: string[];     // mostrati nell'aiuto
}

export const SYNTAX: Record<Lang, EditSyntax> = {
  it: {
    verbs: ["cancella", "cancella le ultime", "cancella gli ultimi", "cancella ultime", "cancella ultimi"],
    wordUnits: ["parole", "parola"],
    sentenceUnits: ["frasi", "frase"],
    rangeFrom: "da",
    rangeTo: "a",
    numbers: { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10 },
    examples: ["cancella 3 parole", "cancella due frasi", "cancella da ciao a mondo", "grassetto ultima parola"],
  },
  en: {
    verbs: ["delete", "delete last", "delete the last", "delete previous"],
    wordUnits: ["words", "word"],
    sentenceUnits: ["sentences", "sentence"],
    rangeFrom: "from",
    rangeTo: "to",
    numbers: { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 },
    examples: ["delete 3 words", "delete two sentences", "delete from hello to world", "bold last word"],
  },
  fr: {
    verbs: ["efface", "efface les", "efface les derniers", "efface les dernières", "supprime", "supprime les", "supprime les derniers", "supprime les dernières"],
    wordUnits: ["mots", "mot"],
    sentenceUnits: ["phrases", "phrase"],
    rangeFrom: "de",
    rangeTo: "à",
    numbers: { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 },
    examples: ["efface 3 mots", "efface deux phrases", "efface de bonjour à monde", "gras dernier mot"],
  },
  es: {
    verbs: ["borra", "borra las", "borra los", "borra las últimas", "borra los últimos"],
    wordUnits: ["palabras", "palabra"],
    sentenceUnits: ["frases", "frase"],
    rangeFrom: "de",
    rangeTo: "a",
    numbers: { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 },
    examples: ["borra 3 palabras", "borra dos frases", "borra de hola a mundo", "negrita última palabra"],
  },
};

export const normalizeWord = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'");

function parseNumber(w: string | undefined, syn: EditSyntax): number | undefined {
  if (w === undefined) return undefined;
  if (/^\d{1,3}$/.test(w)) return Math.max(1, parseInt(w, 10));
  return syn.numbers[w];
}

/** Riconosce "cancella N parole/frasi" e "cancella da X a Y" a partire dalla posizione i. */
export function matchEditPattern(
  words: string[],
  i: number,
  syn: EditSyntax,
): { action: CommandAction; length: number } | null {
  const at = (k: number) => (words[k] === undefined ? undefined : normalizeWord(words[k]));
  const verbs = [...syn.verbs].sort((a, b) => b.split(" ").length - a.split(" ").length);
  for (const verb of verbs) {
    const vw = verb.split(" ");
    if (!vw.every((w, k) => at(i + k) === w)) continue;
    const j = i + vw.length;

    const n = parseNumber(at(j), syn);
    const unit = at(j + 1);
    if (n !== undefined && unit !== undefined) {
      if (syn.wordUnits.includes(unit)) return { action: { type: "edit", op: "deleteWord", n }, length: j + 2 - i };
      if (syn.sentenceUnits.includes(unit)) return { action: { type: "edit", op: "deleteSentence", n }, length: j + 2 - i };
    }

    if (at(j) === syn.rangeFrom) {
      let k = j + 2; // il primo pezzo ha almeno una parola
      while (k < words.length && at(k) !== syn.rangeTo) k++;
      if (k < words.length - 1) {
        const from = words.slice(j + 1, k).map(normalizeWord).join(" ");
        const to = words.slice(k + 1).map(normalizeWord).join(" ");
        return { action: { type: "edit", op: "deleteRange", from, to }, length: words.length - i };
      }
    }
  }
  return null;
}
