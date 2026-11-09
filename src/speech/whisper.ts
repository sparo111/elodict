// Riconoscimento della voce "offline": il microfono viene ascoltato qui, il modello Whisper gira nel browser.
// L'audio non esce dal dispositivo. Il modello (decine di MB) si scarica una volta dal sito Hugging Face.
import type { Lang } from "../commands/types";
import { openMic } from "../audio/devices";
import { WORKLET } from "./worklet";
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
export interface WhisperEngine {
  start(): void;
  stop(): void;
}

export function createWhisperEngine(lang: Lang, model: WhisperModelId, h: Handlers, micId = ""): WhisperEngine {
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

  /**
   * Apre il microfono (quello scelto, o il predefinito se non c'è più) e lo collega al taglio delle frasi.
   * Se il microfono si scollega mentre si ascolta, riparte da solo con quello predefinito e avvisa.
   */
  const connect = async (preferredId: string) => {
    const opened = await openMic(preferredId, { channelCount: 1, echoCancellation: true, noiseSuppression: true });
    stream = opened.stream;
    if (opened.fellBack) h.onNotice?.("mic-fallback");
    if (!running) {
      teardown();
      return;
    }
    // Il contesto audio è già stato creato al tocco di «Detta» (vedi start): su iPhone (Safari) si può avviare solo da un gesto
    // dell'utente, e qui si arriva dopo il caricamento del modello, quando il gesto non c'è più. Se manca (microfono ripreso
    // dopo uno scollegamento) se ne crea uno nuovo.
    ctx ??= new AudioContext();
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
    stream.getAudioTracks()[0]?.addEventListener("ended", () => void onLost());
  };

  /** Il microfono si è scollegato (la traccia finisce da sola, non perché l'abbiamo fermata noi). */
  const onLost = async () => {
    if (!running) return;
    const last = seg?.flush();
    seg = null;
    teardown();
    if (last) enqueue(last);
    h.onNotice?.("mic-lost");
    try {
      await connect("");
    } catch (e) {
      running = false;
      teardown();
      h.onError((e as DOMException)?.name === "NotFoundError" ? "no-mic" : "other");
      h.onState("idle");
    }
  };

  return {
    start() {
      if (running) return;
      running = true;
      h.onState("starting");
      // Ipotesi non verificata su un iPhone vero: creare e avviare il contesto audio ORA, dentro il gesto dell'utente.
      try {
        ctx = new AudioContext();
        void ctx.resume().catch(() => undefined);
      } catch { /* senza contesto audio l'errore esce più avanti, con il suo messaggio */ }
      void (async () => {
        try {
          await prepareModel(model, (pct) => h.onProgress?.(pct));
        } catch {
          running = false;
          teardown();
          h.onError("model");
          h.onState("idle");
          return;
        }
        if (!running) {
          teardown();
          return void h.onState("idle");
        }
        try {
          await connect(micId);
          if (!running) return void h.onState("idle");
          h.onState("listening");
        } catch (e) {
          running = false;
          teardown();
          const name = (e as DOMException)?.name;
          h.onError(name === "NotFoundError" ? "no-mic" : name === "NotAllowedError" || name === "SecurityError" ? "not-allowed" : "other");
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
