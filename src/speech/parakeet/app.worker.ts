// Parakeet TDT 0.6B v3, pesi Olicorne «redux» w2a8 (revisione fissata in models.ts), per «Privato preciso» nell'app.
// Un solo thread, solo WebAssembly. Il modello (~200 MB) si scarica una volta e resta nella memoria «Cache» del browser.
import { loadParakeet, type ParakeetEngine } from "./parakeet";
import { PARAKEET_WEIGHTS, totalBytes } from "./models";
import { ortBaseUrl } from "../../pwa/basePath";

/** Il nome della memoria «Cache» che tiene i file di Parakeet: serve anche a chi li cancella (parakeetEngine.ts). */
const CACHE_NAME = "elodict-parakeet";
const WEIGHTS = "olicorne-w2a8" as const;

const ctx = self as unknown as {
  postMessage(m: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
};

let engine: ParakeetEngine | null = null;

ctx.onmessage = async (e: MessageEvent) => {
  const m = e.data as { type: "load" } | { type: "transcribe"; id: number; audio: Float32Array };
  try {
    if (m.type === "load") {
      if (!engine) {
        const w = PARAKEET_WEIGHTS[WEIGHTS];
        const total = totalBytes(w);
        const loaded = new Map<string, number>();
        engine = await loadParakeet({
          weights: WEIGHTS,
          wasmPaths: ortBaseUrl(import.meta.env.BASE_URL, self.location.origin, "ort31"),
          threads: 1,
          backend: "wasm",
          cacheName: CACHE_NAME,
          onProgress: (l, _t, file) => {
            loaded.set(file, l);
            let sum = 0;
            for (const v of loaded.values()) sum += v;
            ctx.postMessage({ type: "progress", pct: Math.min(100, Math.round((sum / total) * 100)) });
          },
        });
      }
      ctx.postMessage({ type: "ready" });
    } else if (m.type === "transcribe") {
      if (!engine) throw new Error("modello non caricato");
      const r = await engine.transcribe(m.audio);
      ctx.postMessage({ type: "result", id: m.id, text: r.text });
    }
  } catch (err) {
    ctx.postMessage({ type: "error", id: "id" in m ? m.id : undefined, scope: m.type, message: err instanceof Error ? err.message : String(err) });
  }
};
