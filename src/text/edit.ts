/** Quanti caratteri toglie un solo "cancella parola" o "cancella frase" in fondo al testo. */
function oneStep(before: string, op: "deleteWord" | "deleteSentence"): number {
  if (op === "deleteWord") {
    const m = /\s*\S+\s*$/.exec(before);
    return m ? m[0].length : 0;
  }
  const trimmed = before.replace(/\s+$/, "");
  if (!trimmed) return before.length;
  const body = trimmed.replace(/[.?!…]+$/, "");
  let idx = -1;
  for (const ch of [".", "?", "!", "…", "\n"]) idx = Math.max(idx, body.lastIndexOf(ch));
  return before.length - (idx + 1);
}

/**
 * Quanti caratteri cancellare prima del cursore per "cancella parola/frase" (n volte).
 * `before` = testo del paragrafo prima del cursore.
 */
export function charsToDelete(before: string, op: "deleteWord" | "deleteSentence", n = 1): number {
  let total = 0;
  let rest = before;
  for (let k = 0; k < n && rest.length > 0; k++) {
    const c = oneStep(rest, op);
    if (c <= 0) break;
    total += c;
    rest = rest.slice(0, rest.length - c);
  }
  return total;
}

/** Intervallo (nella stringa `before`) dell'ultima parola o frase, senza spazi ai bordi. */
export function rangeOfLast(before: string, unit: "word" | "sentence"): { start: number; end: number } | null {
  const trimmed = before.replace(/\s+$/, "");
  if (!trimmed) return null;
  const n = charsToDelete(trimmed, unit === "word" ? "deleteWord" : "deleteSentence");
  let start = trimmed.length - n;
  while (start < trimmed.length && /\s/.test(trimmed[start])) start++;
  return start < trimmed.length ? { start, end: trimmed.length } : null;
}

/** "cancella da X a Y": l'ultimo X che ha un Y dopo di sé, con il suo spazio iniziale. */
export function rangeFromTo(before: string, from: string, to: string): { start: number; end: number } | null {
  const text = before.toLowerCase();
  const x = from.toLowerCase();
  const y = to.toLowerCase();
  if (!x || !y) return null;
  let s = text.lastIndexOf(x);
  while (s !== -1) {
    const e = text.indexOf(y, s + x.length);
    if (e !== -1) {
      const start = s > 0 && before[s - 1] === " " ? s - 1 : s;
      return { start, end: e + y.length };
    }
    s = s === 0 ? -1 : text.lastIndexOf(x, s - 1);
  }
  return null;
}

/** Titolo del documento: la prima riga, corta. */
export function deriveTitle(text: string, fallback: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const cleaned = line.replace(/[.,;:!?…]+$/, "");
  if (!cleaned) return fallback;
  return cleaned.length > 40 ? cleaned.slice(0, 40).trimEnd() + "…" : cleaned;
}
