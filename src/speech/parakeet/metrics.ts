// Confronto tra il testo riconosciuto e quello giusto: errori sulle parole (WER) e punteggiatura. Funzioni pure.

const PUNCT = /[.,;:!?…]/;
const strip = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']+/gu, "");

/** Parole con la punteggiatura che le segue: «Ciao, mondo.» → [{w:"ciao",p:","},{w:"mondo",p:"."}] */
export function tokenize(text: string): { w: string; p: string }[] {
  const out: { w: string; p: string }[] = [];
  for (const raw of text.trim().split(/\s+/)) {
    if (!raw) continue;
    const w = strip(raw);
    const marks = [...raw].filter((c) => PUNCT.test(c));
    if (!w) {
      // punteggiatura staccata dalla parola: va alla parola prima
      if (out.length && marks.length) out[out.length - 1].p += marks.join("");
      continue;
    }
    // la punteggiatura che conta è quella finale (una virgola in mezzo a «1,5» no)
    const tail = raw.match(/[.,;:!?…]+$/)?.[0] ?? "";
    out.push({ w, p: tail.length ? tail[tail.length - 1] : "" });
  }
  return out;
}

export interface TextScore {
  /** errori sulle parole (sostituzioni + inserimenti + cancellazioni) diviso le parole giuste; senza punteggiatura né maiuscole */
  wer: number;
  words: number;
  errors: number;
  /** punteggiatura finale di parola: quante delle attese sono al posto giusto, e quante in più/in meno */
  punctExpected: number;
  punctCorrect: number;
  punctExtra: number;
}

/** Allinea le parole (distanza di modifica) e confronta le parole e la punteggiatura. */
export function scoreText(reference: string, hypothesis: string): TextScore {
  const a = tokenize(reference);
  const b = tokenize(hypothesis);
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1].w === b[j - 1].w ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  // percorso all'indietro: quali parole si corrispondono
  let i = n;
  let j = m;
  const pair: (number | null)[] = Array(n).fill(null);
  while (i > 0 && j > 0) {
    const cost = a[i - 1].w === b[j - 1].w ? 0 : 1;
    if (d[i][j] === d[i - 1][j - 1] + cost) {
      pair[i - 1] = j - 1;
      i--;
      j--;
    } else if (d[i][j] === d[i - 1][j] + 1) i--;
    else j--;
  }
  let punctExpected = 0;
  let punctCorrect = 0;
  const used = new Set<number>();
  a.forEach((tok, k) => {
    const hj = pair[k];
    if (tok.p) {
      punctExpected++;
      if (hj !== null && b[hj].p === tok.p) punctCorrect++;
    }
    if (hj !== null) used.add(hj);
  });
  let punctExtra = 0;
  b.forEach((tok, jj) => {
    if (!tok.p) return;
    const k = pair.indexOf(jj);
    if (k === -1 || !a[k].p) punctExtra++;
  });
  return { wer: n ? d[n][m] / n : 0, words: n, errors: d[n][m], punctExpected, punctCorrect, punctExtra };
}
