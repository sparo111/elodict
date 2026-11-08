// Pulizia del testo detto: parole riempitive, ripetizioni, dizionario personale.
// Idea ispirata ad altri programmi di dettatura; codice scritto da zero qui.
import { normalizeWord } from "../commands/syntax";
import type { Lang, Token } from "../commands/types";

/** Suoni di esitazione che non fanno parte della frase. Solo suoni, mai parole vere. */
export const FILLERS: Record<Lang, string[]> = {
  it: ["ehm", "ehmm", "eh", "ehh", "uhm", "uhmm", "mmm", "mh", "mhm"],
  en: ["um", "umm", "uh", "uhh", "uhm", "er", "erm", "hmm", "mmm"],
  fr: ["euh", "euhh", "heu", "hum", "hmm", "mmm"],
  es: ["eh", "ehh", "em", "emm", "mmm", "mm", "hmm"],
};

const stripEdges = (w: string) => normalizeWord(w).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

/** Toglie "ehm", "uhm"… dalla frase. */
export function stripFillers(transcript: string, lang: Lang): string {
  const set = new Set(FILLERS[lang]);
  return transcript
    .split(/\s+/)
    .filter((w) => w && !set.has(stripEdges(w)))
    .join(" ");
}

/** "che che" -> "che". Non tocca numeri né parole di una o due lettere ("no no", "ha ha"). */
export function dedupeRepeats(transcript: string): string {
  const out: string[] = [];
  for (const w of transcript.split(/\s+/).filter(Boolean)) {
    const prev = out[out.length - 1];
    const a = stripEdges(w);
    if (prev !== undefined && a.length > 2 && !/\d/.test(a) && stripEdges(prev) === a) continue;
    out.push(w);
  }
  return out.join(" ");
}

export interface DictEntry {
  from: string; // come lo sente il riconoscimento (es. "pippo rossi")
  to: string;   // come lo vuoi scritto (es. "Pippo Rossi")
}

/**
 * Sostituisce le parole del dizionario nei pezzi di testo (mai nei comandi).
 * La voce più lunga vince; il confronto ignora maiuscole e apostrofi tipografici.
 */
export function applyDictionary(tokens: Token[], entries: DictEntry[]): Token[] {
  const rules = entries
    .map((e) => ({ words: e.from.trim().split(/\s+/).map(normalizeWord).filter(Boolean), to: e.to.trim() }))
    .filter((r) => r.words.length > 0 && r.to)
    .sort((a, b) => b.words.length - a.words.length);
  if (!rules.length) return tokens;

  const out: Token[] = [];
  let i = 0;
  while (i < tokens.length) {
    const hit = rules.find((r) =>
      r.words.every((w, k) => {
        const t = tokens[i + k];
        return t !== undefined && t.kind === "word" && stripEdges(t.text) === w;
      }),
    );
    if (hit) {
      out.push({ kind: "word", text: hit.to });
      i += hit.words.length;
    } else {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return out;
}

/** Controlla e normalizza un dizionario importato da file. */
export function parseDictionary(json: string): DictEntry[] {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data) || data.length > 500) throw new Error("formato");
  const out: DictEntry[] = [];
  for (const item of data) {
    const from = (item as { from?: unknown })?.from;
    const to = (item as { to?: unknown })?.to;
    if (typeof from !== "string" || typeof to !== "string") throw new Error("formato");
    if (from.trim() && to.trim() && from.length <= 80 && to.length <= 80) out.push({ from: from.trim(), to: to.trim() });
  }
  return out;
}
