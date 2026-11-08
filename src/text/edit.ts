import type { EditOp } from "../commands/types";

/**
 * Quanti caratteri cancellare prima del cursore per "cancella parola" / "cancella frase".
 * `before` = testo del paragrafo prima del cursore.
 */
export function charsToDelete(before: string, op: Exclude<EditOp, "undo">): number {
  if (op === "deleteWord") {
    const m = /\s*\S+\s*$/.exec(before);
    return m ? m[0].length : 0;
  }
  const trimmed = before.replace(/\s+$/, "");
  const body = trimmed.replace(/[.?!…]+$/, "");
  let idx = -1;
  for (const ch of [".", "?", "!", "…", "\n"]) idx = Math.max(idx, body.lastIndexOf(ch));
  return before.length - (idx + 1);
}

/** Titolo del documento: la prima riga, corta. */
export function deriveTitle(text: string, fallback: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const cleaned = line.replace(/[.,;:!?…]+$/, "");
  if (!cleaned) return fallback;
  return cleaned.length > 40 ? cleaned.slice(0, 40).trimEnd() + "…" : cleaned;
}
