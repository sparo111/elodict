// «Privato preciso»: riconoscimento offline con Parakeet TDT 0.6B v3 (Olicorne «redux» w2a8, ~200 MB). Parte dello stesso microfono, delle
// stesse pause (700 ms) e degli stessi comandi di Whisper: cambia solo chi trasforma la voce in testo. Il modello gira in un lavoratore a parte.
import type { Lang } from "../commands/types";
import type { Handlers } from "./recognizer";
import { createMicEngine, isOfflineSupported, type WhisperEngine } from "./whisper";
import { cleanParakeetText } from "./parakeet/clean";
import { warmEngineCache } from "../pwa/engineCache";

const CACHE_NAME = "elodict-parakeet"; // lo stesso nome di app.worker.ts
const FLAG = "elodict-model-parakeet-w2a8";

/** Lo stesso controllo dell'offline con Whisper: lavoratori, WebAssembly, microfono, AudioWorklet. */
export const isParakeetSupported = isOfflineSupported;

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

/** Questa richiesta di caricamento è ancora quella attuale? (se si è passati ad altro, `loadState` è stato azzerato o sostituito) */
function isCurrentLoad(p: Promise<void> | undefined): boolean {
  return loadState?.promise === p;
}

/** Scarica (la prima volta) e carica il modello. Chiamarla più volte non scarica due volte. */
export function prepareParakeet(onProgress?: (pct: number) => void): Promise<void> {
  if (loadState) {
    if (onProgress) loadState.listeners.add(onProgress);
    return loadState.promise;
  }
  const listeners = new Set<(pct: number) => void>();
  if (onProgress) listeners.add(onProgress);
  const mine: { promise?: Promise<void> } = {}; // serve a riconoscere, più sotto, se questa richiesta è ancora quella attuale
  const promise: Promise<void> = (async () => {
    // Prima i file del motore (onnxruntime 1.31) nella memoria per l'uso senza rete: alla prima visita il service worker non li salverebbe da solo.
    await warmEngineCache("ort31");
    // Se nel frattempo si è passati ad altro, non si carica più niente (un solo modello in memoria alla volta).
    if (!isCurrentLoad(mine.promise)) throw new Error("modello chiuso");
    await new Promise<void>((resolve, reject) => {
      loadWaiter = { resolve, reject };
      getWorker().postMessage({ type: "load" });
    });
    try {
      localStorage.setItem(FLAG, "1");
    } catch { /* senza memoria locale si ricarica ogni volta */ }
  })();
  mine.promise = promise;
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
  // anche se il lavoratore non c'è ancora (si sta ancora aspettando i file del motore): quel caricamento non deve più partire
  loadState = null;
  loadWaiter = null;
  if (!worker) return;
  worker.terminate();
  worker = null;
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
