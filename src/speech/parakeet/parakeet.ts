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
  onProgress?: (loaded: number, total: number, file: string) => void;
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
  for (const f of w.files) blobs[f.name] = await fetchCached(fileUrl(w, f), CACHE, stats, (l, t) => o.onProgress?.(l, t, f.path));

  configureOrtWeb({ wasmPaths: o.wasmPaths, numThreads: o.threads, simd: true, proxy: false });
  const config = JSON.parse(await blobs["config.json"].text());
  const url = (name: string) => URL.createObjectURL(blobs[name]);
  // L'encoder va sull'acceleratore scelto; il decoder (piccolo) sta sempre su WebAssembly (lo fa anche parakeet.js).
  const model = (await createAsrModel({
    modelType: "nemo-conformer-tdt",
    decoderKind: "tdt",
    config,
    preprocessorModel: url("nemo128.onnx"),
    encoderModel: url("encoder"),
    decoderJointModel: url("decoder"),
    vocabularyText: await blobs["vocab.txt"].text(),
    sessionOptions: { executionProviders: [o.backend === "webgpu" ? "webgpu" : "wasm"] },
  })) as unknown as {
    preprocessor: { run: Async } | null;
    encoder: { run: Async };
    decoder: { decode: Async };
    transcribeSamples(s: Float32Array, sr?: number): Promise<{ text: string }>;
  };

  // I tempi si misurano avvolgendo le tre fasi del motore (le funzioni originali restano quelle della libreria).
  let pre = 0;
  let enc = 0;
  let dec = 0;
  const wrap = (obj: Record<string, unknown> | null, key: string, add: (ms: number) => void) => {
    if (!obj) return;
    const orig = (obj[key] as Async).bind(obj);
    obj[key] = async (...a: unknown[]) => {
      const s = performance.now();
      try {
        return await orig(...a);
      } finally {
        add(performance.now() - s);
      }
    };
  };
  wrap(model.preprocessor as Record<string, unknown> | null, "run", (ms) => (pre += ms));
  wrap(model.encoder as unknown as Record<string, unknown>, "run", (ms) => (enc += ms));
  wrap(model.decoder as unknown as Record<string, unknown>, "decode", (ms) => (dec += ms));

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
