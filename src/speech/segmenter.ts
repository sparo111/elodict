// Taglia il flusso del microfono in frasi, ascoltando le pause.
// Whisper non lavora "a flusso": va nutrito una frase alla volta. Questa classe non usa né il microfono
// né il modello, quindi si prova da sola con segnali finti.

export interface SegmenterOptions {
  sampleRate?: number;       // 16000: quello che vuole Whisper
  frameMs?: number;          // ogni quanto misura l'energia
  silenceMs?: number;        // pausa che chiude una frase
  minSpeechMs?: number;      // frasi più corte sono rumore e si scartano
  maxUtteranceMs?: number;   // frasi lunghissime si tagliano comunque
  preRollMs?: number;        // un po' di audio prima dell'inizio, per non mangiare la prima sillaba
  minThreshold?: number;     // sotto questo livello non è mai voce
}

export interface Utterance {
  samples: Float32Array;
  durationMs: number;
  peak: number;              // livello massimo: serve a scartare i falsi allarmi
}

const rms = (a: Float32Array, from: number, to: number) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += a[i] * a[i];
  return Math.sqrt(sum / Math.max(1, to - from));
};

export class Segmenter {
  private readonly frame: number;
  private readonly silenceFrames: number;
  private readonly minSpeechFrames: number;
  private readonly maxFrames: number;
  private readonly preRoll: number;
  private readonly minThreshold: number;

  private pending = new Float32Array(0);   // campioni non ancora arrivati a una misura intera
  private preBuf: Float32Array[] = [];     // ultimi frame silenziosi
  private cur: Float32Array[] = [];        // frasi in corso
  private speechFrames = 0;
  private silentRun = 0;
  private peak = 0;
  private inSpeech = false;
  private floor = 0.004;                   // rumore di fondo stimato

  constructor(o: SegmenterOptions = {}) {
    const sr = o.sampleRate ?? 16000;
    const frameMs = o.frameMs ?? 30;
    this.frame = Math.round((sr * frameMs) / 1000);
    this.silenceFrames = Math.round((o.silenceMs ?? 700) / frameMs);
    this.minSpeechFrames = Math.round((o.minSpeechMs ?? 300) / frameMs);
    this.maxFrames = Math.round((o.maxUtteranceMs ?? 20000) / frameMs);
    this.preRoll = Math.round((o.preRollMs ?? 240) / frameMs);
    this.minThreshold = o.minThreshold ?? 0.012;
    this.sr = sr;
  }
  private readonly sr: number;

  /** Soglia attuale: il rumore di fondo moltiplicato, ma mai sotto il minimo. */
  get threshold() {
    return Math.max(this.minThreshold, this.floor * 3);
  }

  /** Dà un pezzo di audio; restituisce le frasi che si sono chiuse. */
  push(chunk: Float32Array): Utterance[] {
    const joined = new Float32Array(this.pending.length + chunk.length);
    joined.set(this.pending);
    joined.set(chunk, this.pending.length);

    const out: Utterance[] = [];
    let i = 0;
    while (i + this.frame <= joined.length) {
      const frame = joined.slice(i, i + this.frame);
      i += this.frame;
      const u = this.step(frame);
      if (u) out.push(u);
    }
    this.pending = joined.slice(i);
    return out;
  }

  /** Chiude la frase in corso (per esempio quando si preme Ferma). */
  flush(): Utterance | null {
    const rest = this.pending;
    this.pending = new Float32Array(0);
    if (rest.length && this.inSpeech) this.cur.push(rest);
    return this.close();
  }

  private step(frame: Float32Array): Utterance | null {
    const level = rms(frame, 0, frame.length);
    const speaking = level > this.threshold;

    if (!this.inSpeech) {
      if (speaking) {
        this.inSpeech = true;
        this.cur = [...this.preBuf, frame];
        this.preBuf = [];
        this.speechFrames = 1;
        this.silentRun = 0;
        this.peak = level;
      } else {
        // il rumore di fondo si adatta solo quando nessuno parla
        this.floor = this.floor * 0.95 + level * 0.05;
        this.preBuf.push(frame);
        if (this.preBuf.length > this.preRoll) this.preBuf.shift();
      }
      return null;
    }

    this.cur.push(frame);
    this.peak = Math.max(this.peak, level);
    if (speaking) {
      this.speechFrames++;
      this.silentRun = 0;
    } else {
      this.silentRun++;
    }
    if (this.silentRun >= this.silenceFrames || this.cur.length >= this.maxFrames) return this.close();
    return null;
  }

  private close(): Utterance | null {
    const frames = this.cur;
    const speech = this.speechFrames;
    const peak = this.peak;
    this.cur = [];
    this.inSpeech = false;
    this.speechFrames = 0;
    this.silentRun = 0;
    this.peak = 0;
    if (!frames.length || speech < this.minSpeechFrames) return null;
    const total = frames.reduce((n, f) => n + f.length, 0);
    const samples = new Float32Array(total);
    let at = 0;
    for (const f of frames) {
      samples.set(f, at);
      at += f.length;
    }
    return { samples, durationMs: (total / this.sr) * 1000, peak };
  }
}

/** Porta l'audio a 16.000 campioni al secondo (quello che vuole Whisper) con un'interpolazione semplice. */
export function resampleTo16k(input: Float32Array, inRate: number): Float32Array {
  if (inRate === 16000) return input;
  const ratio = inRate / 16000;
  const n = Math.floor(input.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = input[i0];
    const b = input[Math.min(i0 + 1, input.length - 1)];
    out[i] = a + (b - a) * frac;
  }
  return out;
}

/** Whisper, davanti al silenzio, a volte "inventa" frasi tipiche. Qui si scartano i casi più noti. */
const KNOWN_GHOSTS = [
  "thank you", "thanks for watching", "thank you for watching", "you",
  "sottotitoli e revisione a cura di qtss", "sottotitoli creati dalla comunità di amara.org",
  "iscriviti al canale", "grazie per la visione", "grazie a tutti",
  "sous-titres réalisés par la communauté d'amara.org", "sous-titrage st' 501", "merci d'avoir regardé cette vidéo",
  "subtítulos realizados por la comunidad de amara.org", "gracias por ver el vídeo", "suscríbete",
];
const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}' .]/gu, "").replace(/\s+/g, " ").trim().replace(/[. ]+$/g, "");

export function cleanWhisperText(raw: string): string {
  let t = raw
    .replace(/\[[^\]]*\]/g, " ")   // [BLANK_AUDIO], [Music]
    .replace(/\([^)]*\)/g, " ")    // (musica)
    .replace(/[♪♫]+[^♪♫]*[♪♫]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return "";
  if (KNOWN_GHOSTS.includes(norm(t))) return "";
  return t;
}
