// «Privato preciso»: riconoscimento offline con Parakeet TDT 0.6B v3 (Olicorne «redux» w2a8, ~200 MB). Parte dello stesso microfono, delle
// stesse pause (700 ms) e degli stessi comandi di Whisper: cambia solo chi trasforma la voce in testo. Il modello gira in un lavoratore a parte.
import type { Lang } from "../commands/types";
import type { Handlers } from "./recognizer";
import { createMicEngine, isOfflineSupported, type WhisperEngine } from "./whisper";
import { cleanParakeetText } from "./parakeet/clean";
import { ortBaseUrl } from "../pwa/basePath";

const CACHE_NAME = "elodict-parakeet"; // lo stesso nome di app.worker.ts
const FLAG = "elodict-model-parakeet-w2a8";

/** Lo stesso controllo dell'offline con Whisper: lavoratori, WebAssembly, microfono, AudioWorklet. */
export const isParakeetSupported = isOfflineSupported;

/**
 * Per l'uso senza internet: i file del motore (onnxruntime 1.31) vengono messi subito nella memoria del programma di salvataggio offline
 * («elodict-motore», la stessa che usa il service worker per i file di ort/). Altrimenti, se il modello si scarica durante la PRIMA visita
 * (quando il service worker non controlla ancora la pagina), quei file non verrebbero mai salvati e senza internet il modello non partirebbe.
 */
async function warmEngineCache(): Promise<void> {
  try {
    const base = ortBaseUrl(import.meta.env.BASE_URL, location.origin, "ort31");
    const cache = await caches.open("elodict-motore");
    for (const f of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]) {
      const url = base + f;
      if (await cache.match(url)) continue;
      const res = await fetch(url);
      if (res.ok) await cache.put(url, res);
    }
  } catch {
    /* senza memoria o senza rete: si prova lo stesso, il motore si scaricherà quando serve */
  }
}

/* ---------- il lavoratore e i suoi messaggi ---------- */
let worker: Worker | null = null;
let nextId = 1;
const jobs = new Map<number, { resolve: (t: string) => void; reject: (e: Error) => void }>();
let loadWaiter: { resolve: () => void; reject: (e: Error) => void } | null = null;
let loadState: { promise: Promise<void>; listeners: Set<(pct: number) => void> } | null = null;

function failAll(err: Error) {
  loadWaiter?.reject(err);
  loadWaiter = null;
  for (const j of jobs.values()) j.reject(err);
  jobs.clear();
  loadState = null;
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./parakeet/app.worker.ts", import.meta.url), { type: "module" });
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
export function prepareParakeet(onProgress?: (pct: number) => void): Promise<void> {
  if (loadState) {
    if (onProgress) loadState.listeners.add(onProgress);
    return loadState.promise;
  }
  const listeners = new Set<(pct: number) => void>();
  if (onProgress) listeners.add(onProgress);
  const promise = warmEngineCache().then(() => new Promise<void>((resolve, reject) => {
    loadWaiter = { resolve, reject };
    getWorker().postMessage({ type: "load" });
  })).then(() => {
    try {
      localStorage.setItem(FLAG, "1");
    } catch { /* senza memoria locale si ricarica ogni volta */ }
  });
  promise.catch(() => undefined);
  loadState = { promise, listeners };
  return promise;
}

export function isParakeetReady(): boolean {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

/**
 * Chiude il lavoratore di Parakeet e libera la sua memoria (il modello scaricato resta nella memoria del browser).
 * Si usa quando si passa a un altro riconoscitore: in memoria deve esserci un solo modello alla volta.
 */
export function releaseParakeet(): void {
  if (!worker) return;
  worker.terminate();
  worker = null;
  loadState = null;
  loadWaiter = null;
  jobs.forEach((j) => j.reject(new Error("modello chiuso")));
  jobs.clear();
}

/** Cancella il modello scaricato di Parakeet. */
export async function deleteParakeet(): Promise<void> {
  worker?.terminate();
  worker = null;
  loadState = null;
  loadWaiter = null;
  jobs.clear();
  try {
    await caches.delete(CACHE_NAME);
  } catch { /* nessuna memoria da svuotare */ }
  try {
    localStorage.removeItem(FLAG);
  } catch { /* ok */ }
}

export function transcribeParakeet(audio: Float32Array): Promise<string> {
  const id = nextId++;
  return new Promise<string>((resolve, reject) => {
    jobs.set(id, { resolve, reject });
    getWorker().postMessage({ type: "transcribe", id, audio }, [audio.buffer]);
  });
}

/** Il riconoscitore «Privato preciso». La lingua si riconosce da sola: `lang` non serve (vedi AUDIT_T013d.md per i rischi). */
export function createParakeetEngine(lang: Lang, h: Handlers, micId = ""): WhisperEngine {
  return createMicEngine(lang, h, micId, {
    prepare: (onProgress) => prepareParakeet(onProgress),
    transcribe: (samples) => transcribeParakeet(samples),
    clean: cleanParakeetText,
  });
}
