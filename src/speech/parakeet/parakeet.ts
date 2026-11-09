// Parakeet TDT 0.6B v3 nel browser, con onnx-asr-web (e il suo onnxruntime-web 1.24 o più nuovo: la versione che l'app usa per
// Whisper, 1.22, è troppo vecchia per questa libreria, quindi i file del motore sono una copia a parte, in ort24/).
import { configureOrtWeb, createAsrModel } from "onnx-asr-web";
import { fetchCached, type FetchStats } from "./download";
import { fileUrl, PARAKEET_WEIGHTS, type ParakeetWeightsId } from "./models";

export interface ParakeetOptions {
  weights: ParakeetWeightsId;
  /** indirizzo (con barra finale) dei file di onnxruntime-web 1.24+ */
  wasmPaths: string;
  threads: number;
  /** «wasm» o «webgpu» (solo l'encoder: il decoder resta su WebAssembly) */
  backend: "wasm" | "webgpu";
  /**
   * Modalità a poca memoria (T013c, per i telefoni): niente ottimizzazioni del grafo (che fanno copie dei pesi), niente «arena» di
   * memoria di riserva, esecuzione in sequenza, e i collegamenti ai file scaricati vengono liberati appena le sessioni sono create.
   */
  lowMemory?: boolean;
  onProgress?: (loaded: number, total: number, file: string, index: number, count: number) => void;
  /** dice in che fase si è, PRIMA di entrarci (serve al diario della pagina di prova) */
  onPhase?: (kind: "download" | "session" | "run", text: string) => void;
}

export interface ParakeetTimings {
  /** preparazione dell'audio (spettro «mel», con il modello nemo128) */
  preMs: number;
  /** encoder */
  encMs: number;
  /** generazione del testo (decoder) */
  decMs: number;
  /** tutto, dall'audio al testo */
  totalMs: number;
}
export interface ParakeetEngine {
  transcribe(samples: Float32Array): Promise<{ text: string; timings: ParakeetTimings }>;
  stats: FetchStats;
  loadMs: number;
}

const CACHE = "parakeet-prova";

type Async = (...a: unknown[]) => Promise<unknown>;

export async function loadParakeet(o: ParakeetOptions): Promise<ParakeetEngine> {
  const t0 = performance.now();
  const w = PARAKEET_WEIGHTS[o.weights];
  const stats: FetchStats = { networkBytes: 0, cachedBytes: 0 };
  const blobs: Record<string, Blob> = {};
  const MB = 1024 * 1024;
  for (const [i, f] of w.files.entries()) {
    o.onPhase?.("download", `scaricamento file ${i + 1} di ${w.files.length}: ${f.path} (${(f.bytes / MB).toFixed(1)} MB)`);
    blobs[f.name] = await fetchCached(fileUrl(w, f), CACHE, stats, (l, t) => o.onProgress?.(l, t, f.path, i + 1, w.files.length));
  }

  o.onPhase?.("session", `configurazione di onnxruntime-web (${o.threads} thread, ${o.backend}${o.lowMemory ? ", poca memoria" : ""})`);
  configureOrtWeb({ wasmPaths: o.wasmPaths, numThreads: o.threads, simd: true, proxy: false });
  const config = JSON.parse(await blobs["config.json"].text());
  const urls: string[] = [];
  const url = (name: string) => {
    const u = URL.createObjectURL(blobs[name]);
    urls.push(u);
    return u;
  };
  const vocab = await blobs["vocab.txt"].text();
  // L'encoder va sull'acceleratore scelto; il decoder (piccolo) sta sempre su WebAssembly (lo fa anche parakeet.js).
  o.onPhase?.("session", `creazione delle sessioni onnxruntime: preprocessore nemo128, encoder (${(w.files.find((f) => f.name === "encoder")!.bytes / MB).toFixed(0)} MB, il file entra in memoria qui), decoder`);
  const model = (await createAsrModel({
    modelType: "nemo-conformer-tdt",
    decoderKind: "tdt",
    config,
    preprocessorModel: url("nemo128.onnx"),
    encoderModel: url("encoder"),
    decoderJointModel: url("decoder"),
    vocabularyText: vocab,
    sessionOptions: {
      executionProviders: [o.backend === "webgpu" ? "webgpu" : "wasm"],
      ...(o.lowMemory ? { graphOptimizationLevel: "disabled", enableCpuMemArena: false, enableMemPattern: false, executionMode: "sequential" } : {}),
    },
  })) as unknown as {
    preprocessor: { run: Async } | null;
    encoder: { run: Async };
    decoder: { decode: Async };
    transcribeSamples(s: Float32Array, sr?: number): Promise<{ text: string }>;
  };
  o.onPhase?.("session", "sessioni create");
  if (o.lowMemory) {
    // i file sono ormai dentro il motore: si lasciano andare i collegamenti, così il browser può liberare la memoria
    for (const u of urls) URL.revokeObjectURL(u);
    for (const k of Object.keys(blobs)) delete blobs[k];
  }

  // I tempi si misurano avvolgendo le tre fasi del motore (le funzioni originali restano quelle della libreria).
  let pre = 0;
  let enc = 0;
  let dec = 0;
  const wrap = (obj: Record<string, unknown> | null, key: string, what: string, add: (ms: number) => void) => {
    if (!obj) return;
    const orig = (obj[key] as Async).bind(obj);
    obj[key] = async (...a: unknown[]) => {
      o.onPhase?.("run", what);
      const s = performance.now();
      try {
        return await orig(...a);
      } finally {
        add(performance.now() - s);
      }
    };
  };
  wrap(model.preprocessor as Record<string, unknown> | null, "run", "preparazione dell'audio (spettro mel)", (ms) => (pre += ms));
  wrap(model.encoder as unknown as Record<string, unknown>, "run", "encoder", (ms) => (enc += ms));
  wrap(model.decoder as unknown as Record<string, unknown>, "decode", "decoder (generazione del testo)", (ms) => (dec += ms));

  return {
    stats,
    loadMs: performance.now() - t0,
    async transcribe(samples) {
      pre = enc = dec = 0;
      const s = performance.now();
      const r = await model.transcribeSamples(samples, 16000);
      return { text: r.text, timings: { preMs: pre, encMs: enc, decMs: dec, totalMs: performance.now() - s } };
    },
  };
}
