// Riconoscimento della voce "offline": il microfono viene ascoltato qui, il modello Whisper gira nel browser.
// L'audio non esce dal dispositivo. Il modello (decine di MB) si scarica una volta dal sito Hugging Face.
import type { Lang } from "../commands/types";
import type { Handlers } from "./recognizer";
import { cleanWhisperText, resampleTo16k, Segmenter, type Utterance } from "./segmenter";

export type WhisperModelId = "tiny" | "base";
export const WHISPER_MODELS: Record<WhisperModelId, { repo: string; approxMB: number }> = {
  tiny: { repo: "Xenova/whisper-tiny", approxMB: 40 },
  base: { repo: "Xenova/whisper-base", approxMB: 80 },
};
const LANG_NAME: Record<Lang, string> = { it: "italian", en: "english", fr: "french", es: "spanish" };
const CACHE_NAME = "transformers-cache";
const flagKey = (m: WhisperModelId) => `elodict-model-${m}`;

export function isOfflineSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioWorkletNode !== "undefined"
  );
}

/* ---------- il lavoratore e i suoi messaggi ---------- */
let worker: Worker | null = null;
let nextId = 1;
const jobs = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let loadWaiter: { resolve: () => void; reject: (e: Error) => void } | null = null;
let loadState: { repo: string; promise: Promise<void>; listeners: Set<(pct: number) => void> } | null = null;

function failAll(err: Error) {
  loadWaiter?.reject(err);
  loadWaiter = null;
  for (const j of jobs.values()) j.reject(err);
  jobs.clear();
  loadState = null;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data as { type: string; id?: number; pct?: number; text?: string; message?: string; scope?: string };
    if (m.type === "progress") {
      loadState?.listeners.forEach((fn) => fn(m.pct ?? 0));
    } else if (m.type === "ready") {
      loadWaiter?.resolve();
      loadWaiter = null;
    } else if (m.type === "result" && m.id !== undefined) {
      jobs.get(m.id)?.resolve(m.text ?? "");
      jobs.delete(m.id);
    } else if (m.type === "error") {
      const err = new Error(m.message ?? "errore del modello");
      if (m.scope === "load") {
        loadWaiter?.reject(err);
        loadWaiter = null;
        loadState = null;
      } else if (m.id !== undefined) {
        jobs.get(m.id)?.reject(err);
        jobs.delete(m.id);
      }
    }
  };
  worker.onerror = (e) => failAll(new Error(e.message || "errore del lavoratore"));
  return worker;
}

/** Scarica (la prima volta) e carica il modello. Chiamarla più volte non scarica due volte. */
export function prepareModel(model: WhisperModelId, onProgress?: (pct: number) => void): Promise<void> {
  const repo = WHISPER_MODELS[model].repo;
  if (loadState && loadState.repo === repo) {
    if (onProgress) loadState.listeners.add(onProgress);
    return loadState.promise;
  }
  const listeners = new Set<(pct: number) => void>();
  if (onProgress) listeners.add(onProgress);
  const promise = new Promise<void>((resolve, reject) => {
    loadWaiter = { resolve, reject };
    getWorker().postMessage({ type: "load", repo });
  }).then(() => {
    try {
      localStorage.setItem(flagKey(model), "1");
    } catch { /* senza memoria locale si ricarica ogni volta */ }
  });
  promise.catch(() => undefined);
  loadState = { repo, promise, listeners };
  return promise;
}

export function isModelReady(model: WhisperModelId): boolean {
  try {
    return localStorage.getItem(flagKey(model)) === "1";
  } catch {
    return false;
  }
}

/** Cancella i modelli scaricati dalla memoria del browser. */
export async function deleteModels(): Promise<void> {
  worker?.terminate();
  worker = null;
  loadState = null;
  loadWaiter = null;
  jobs.clear();
  try {
    await caches.delete(CACHE_NAME);
  } catch { /* nessuna memoria da svuotare */ }
  for (const m of Object.keys(WHISPER_MODELS) as WhisperModelId[]) {
    try {
      localStorage.removeItem(flagKey(m));
    } catch { /* ok */ }
  }
}

function transcribeAudio(audio: Float32Array, lang: Lang): Promise<string> {
  const id = nextId++;
  return new Promise<string>((resolve, reject) => {
    jobs.set(id, { resolve, reject });
    getWorker().postMessage({ type: "transcribe", id, audio, language: LANG_NAME[lang] }, [audio.buffer]);
  });
}

/* ---------- il microfono ---------- */
const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = []; this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      this.buf.push(new Float32Array(ch)); this.n += ch.length;
      if (this.n >= 4096) {
        const out = new Float32Array(this.n); let o = 0;
        for (const b of this.buf) { out.set(b, o); o += b.length; }
        this.port.postMessage(out, [out.buffer]); this.buf = []; this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
`;

export interface WhisperEngine {
  start(): void;
  stop(): void;
}

export function createWhisperEngine(lang: Lang, model: WhisperModelId, h: Handlers): WhisperEngine {
  let running = false;
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let node: AudioWorkletNode | null = null;
  let seg: Segmenter | null = null;
  let queue: Promise<void> = Promise.resolve();
  let busy = 0;

  const enqueue = (u: Utterance) => {
    busy++;
    h.onInterim("…");
    queue = queue.then(async () => {
      try {
        const text = cleanWhisperText(await transcribeAudio(u.samples, lang));
        if (text) h.onFinal(text);
      } catch {
        h.onError("model");
      } finally {
        busy--;
        if (busy === 0) h.onInterim("");
      }
    });
  };

  const teardown = () => {
    node?.port.close();
    node?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    void ctx?.close();
    node = null;
    stream = null;
    ctx = null;
  };

  return {
    start() {
      if (running) return;
      running = true;
      h.onState("starting");
      void (async () => {
        try {
          await prepareModel(model, (pct) => h.onProgress?.(pct));
        } catch {
          running = false;
          h.onError("model");
          h.onState("idle");
          return;
        }
        if (!running) return void h.onState("idle");
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
          });
        } catch (e) {
          running = false;
          h.onError((e as DOMException)?.name === "NotFoundError" ? "no-mic" : "not-allowed");
          h.onState("idle");
          return;
        }
        if (!running) {
          teardown();
          return void h.onState("idle");
        }
        try {
          ctx = new AudioContext();
          await ctx.resume();
          const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
          await ctx.audioWorklet.addModule(url);
          URL.revokeObjectURL(url);
          node = new AudioWorkletNode(ctx, "capture");
          const mute = ctx.createGain();
          mute.gain.value = 0;
          ctx.createMediaStreamSource(stream).connect(node);
          node.connect(mute).connect(ctx.destination);
          const rate = ctx.sampleRate;
          seg = new Segmenter();
          node.port.onmessage = (e: MessageEvent<Float32Array>) => {
            if (!seg) return;
            for (const u of seg.push(resampleTo16k(e.data, rate))) enqueue(u);
          };
          h.onState("listening");
        } catch {
          running = false;
          teardown();
          h.onError("other");
          h.onState("idle");
        }
      })();
    },
    stop() {
      if (!running) return;
      running = false;
      const last = seg?.flush();
      seg = null;
      teardown();
      if (last) enqueue(last);
      // le ultime parole vengono ancora trascritte prima di tornare a "fermo"
      void queue.then(() => h.onState("idle"));
    },
  };
}
