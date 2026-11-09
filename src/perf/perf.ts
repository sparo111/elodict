// Misura dei tempi del riconoscimento offline (T013b). SOLO nelle build di prova: ogni uso sta dentro `if (__ELODICT_TEST_HOOKS__)`,
// che nella build pubblicata vale falso e il codice sparisce (lo controlla `npm run check:dist`).
// Si attiva con ?perf=1; ?silence=550 cambia la pausa che chiude la frase; ?threads=2 i thread di Whisper; ?device=webgpu.

export interface PerfConfig {
  silenceMs: number;
  threads: number;
  device: "wasm" | "webgpu";
}

export function perfEnabled(): boolean {
  return typeof location !== "undefined" && new URLSearchParams(location.search).has("perf");
}

export function perfConfig(): PerfConfig {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
  return {
    silenceMs: Number(q.get("silence")) || 700,
    threads: Number(q.get("threads")) || 1,
    device: q.get("device") === "webgpu" ? "webgpu" : "wasm",
  };
}

/** Un istante in millisecondi sull'orologio comune (vale anche tra la pagina e il lavoratore). */
export const epochNow = () => performance.timeOrigin + performance.now();

/** Quello che il lavoratore dice di aver fatto per una frase. */
export interface WorkerPerf {
  /** quando il lavoratore ha ricevuto la frase e quando ha finito */
  tStart: number;
  tEnd: number;
  /** dall'arrivo al primo encoder: lo spettro log-mel in JavaScript */
  featureMs: number;
  encoderMs: number;
  decoderMs: number;
  decoderSteps: number;
}

export interface PerfRow {
  n: number;
  /** durata dell'audio della frase */
  audioMs: number;
  /** dall'ultimo suono di voce all'uscita della frase dal segmentatore (la pausa che chiude la frase + il pezzetto d'audio) */
  silenceMs: number;
  /** preparazione dell'audio: ricampionamento a 16 kHz e consegna al lavoratore */
  prepMs: number;
  /** attesa nel lavoratore prima di cominciare (frasi precedenti ancora in elaborazione) */
  queueMs: number;
  featureMs: number;
  encoderMs: number;
  decoderMs: number;
  decoderSteps: number;
  /** dal ritorno del lavoratore al testo pulito */
  returnMs: number;
  /** dal testo pulito al testo sullo schermo (un frame) */
  screenMs: number;
  /** TUTTO: dall'ultimo suono di voce al testo sullo schermo */
  totalMs: number;
  text: string;
}

const rows: PerfRow[] = [];
const listeners = new Set<() => void>();
let snapshot: readonly PerfRow[] = [];

export function addPerfRow(r: PerfRow) {
  rows.push(r);
  snapshot = [...rows];
  (window as unknown as { __perfRows: PerfRow[] }).__perfRows = rows;
  listeners.forEach((l) => l());
}
export const subscribePerf = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getPerfRows = () => snapshot;
export const clearPerfRows = () => {
  rows.length = 0;
  snapshot = [];
  listeners.forEach((l) => l());
};

/** Livello (RMS) di un pezzetto di audio: serve a sapere quando c'è stata voce. */
export function rmsOf(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, a.length));
}
