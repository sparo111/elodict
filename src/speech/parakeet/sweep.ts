// Prova della «pausa che chiude la frase» (silenceMs): si fa ascoltare al Segmenter un audio registrato, a pezzi come arriva dal
// microfono, e si guarda (1) in quante frasi lo taglia, (2) quanto ritardo c'è tra la fine della voce e l'uscita della frase.
// Funzione pura: la usano sia le prove sulla logica sia la pagina di prova.
import { Segmenter } from "../segmenter";

export interface Piece {
  /** inizio e fine (secondi) di un tratto di voce, trovati con un rilevatore di energia indipendente dal Segmenter */
  startS: number;
  endS: number;
}
export interface SweepResult {
  silenceMs: number;
  /** quante frasi ha emesso il Segmenter */
  emitted: number;
  /** quante frasi si volevano (le pause lunghe tra una frase e l'altra) */
  expected: number;
  /** frasi tagliate a metà (emesse in più del previsto) */
  splits: number;
  /** ritardo (ms) tra la fine della voce di ogni frase emessa e il momento in cui esce, sull'orologio dell'audio */
  delaysMs: number[];
  meanDelayMs: number;
}

/** Tratti di voce separati da pause più lunghe di `gapMs` (energia a blocchi di 30 ms sopra la soglia). */
export function voicedRuns(samples: Float32Array, sampleRate: number, gapMs: number, threshold = 0.012): Piece[] {
  const frame = Math.round(sampleRate * 0.03);
  const runs: Piece[] = [];
  let cur: Piece | null = null;
  for (let i = 0; i + frame <= samples.length; i += frame) {
    let s = 0;
    for (let j = i; j < i + frame; j++) s += samples[j] * samples[j];
    const voiced = Math.sqrt(s / frame) > threshold;
    const t = i / sampleRate;
    if (voiced) {
      if (cur && t - cur.endS <= gapMs / 1000) cur.endS = t + 0.03;
      else {
        cur = { startS: t, endS: t + 0.03 };
        runs.push(cur);
      }
    }
  }
  return runs;
}

/** Fa ascoltare `samples` (16 kHz) al Segmenter con la pausa `silenceMs`, a pezzi di `chunk` campioni. */
export function runSweep(samples: Float32Array, silenceMs: number, expectedPhrases: number, chunk = 1365): SweepResult {
  const seg = new Segmenter({ silenceMs });
  const sr = 16000;
  // «fine della voce» di riferimento: l'ultimo tratto di voce (separato da almeno 100 ms) che è finito prima del momento dell'uscita
  const truth = voicedRuns(samples, sr, 100);
  const delays: number[] = [];
  let emitted = 0;
  const note = (nowS: number) => {
    emitted++;
    let ref = 0;
    for (const r of truth) if (r.endS <= nowS) ref = r.endS;
    delays.push((nowS - ref) * 1000);
  };
  for (let i = 0; i < samples.length; i += chunk) {
    const now = Math.min(samples.length, i + chunk) / sr;
    for (const _u of seg.push(samples.slice(i, i + chunk))) {
      void _u;
      note(now);
    }
  }
  if (seg.flush()) emitted++; // quel che resta alla fine (tasto Ferma): non conta come ritardo
  const full = delays; // ritardi delle frasi uscite da sole (non quella che resta al tasto Ferma)
  return {
    silenceMs,
    emitted,
    expected: expectedPhrases,
    splits: Math.max(0, emitted - expectedPhrases),
    delaysMs: full,
    meanDelayMs: full.length ? full.reduce((a, b) => a + b, 0) / full.length : 0,
  };
}
