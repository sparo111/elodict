// Ricerca nei documenti: senza badare a maiuscole e accenti, e tutte le parole scritte devono comparire (nel titolo o nel testo).

/** Minuscolo e senza accenti. `map[i]` dice a quale carattere del testo vero corrisponde il carattere i del risultato. */
function fold(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let i = 0;
  for (const ch of s) {
    const f = ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (let k = 0; k < f.length; k++) map.push(i);
    text += f;
    i += ch.length;
  }
  return { text, map };
}

export const normalize = (s: string) => fold(s).text;

/** Le parole cercate (una o più, separate da spazi). */
export function queryWords(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** Il documento contiene tutte le parole cercate? Una ricerca vuota li prende tutti. */
export function matches(title: string, text: string, query: string): boolean {
  const words = queryWords(query);
  if (words.length === 0) return true;
  const hay = normalize(`${title}\n${text}`);
  return words.every((w) => hay.includes(w));
}

export interface Snippet {
  before: string;
  match: string;
  after: string;
}

/** Un pezzetto di testo attorno alla prima parola trovata, per far vedere dove sta. Nessun risultato se la parola è solo nel titolo. */
export function snippetOf(text: string, query: string, radius = 36): Snippet | null {
  const words = queryWords(query);
  if (words.length === 0) return null;
  const { text: folded, map } = fold(text);
  let best = -1;
  let len = 0;
  for (const w of words) {
    const at = folded.indexOf(w);
    if (at >= 0 && (best < 0 || at < best)) {
      best = at;
      len = w.length;
    }
  }
  if (best < 0) return null;
  const start = map[best];
  const end = map[best + len - 1] + 1;
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  const oneLine = (s: string) => s.replace(/\s+/g, " ");
  return {
    before: (from > 0 ? "…" : "") + oneLine(text.slice(from, start)),
    match: oneLine(text.slice(start, end)),
    after: oneLine(text.slice(end, to)) + (to < text.length ? "…" : ""),
  };
}
