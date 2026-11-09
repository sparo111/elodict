// Lavoratore in background: carica il modello Whisper e trascrive. Gira nel browser, niente server.
import { env, pipeline } from "@huggingface/transformers";
import { ortBaseUrl } from "../pwa/basePath";
import { epochNow, type WorkerPerf } from "../perf/perf";

// Il modello si scarica dal sito Hugging Face una volta e poi resta nella memoria del browser.
env.allowLocalModels = false;
env.useBrowserCache = true;
// I file del motore (WebAssembly) sono serviti dal nostro sito, non da un sito esterno.
const wasm = env.backends.onnx.wasm as { wasmPaths?: string; numThreads?: number } | undefined;
if (wasm) {
  // Indirizzo completo (con il sito davanti): così lo strumento di sviluppo non lo rielabora.
  wasm.wasmPaths = ortBaseUrl(import.meta.env.BASE_URL, self.location.origin);
  wasm.numThreads = 1;
}

type Out = { text: string };
type Asr = ((audio: Float32Array, opts: Record<string, unknown>) => Promise<Out>) & {
  model?: { sessions?: Record<string, { run: (...a: unknown[]) => Promise<unknown> }> };
};

const ctx = self as unknown as {
  postMessage(m: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
};

// Misura dei tempi (solo build di prova): encoder e decoder si misurano avvolgendo le sessioni del motore.
let pStart = 0;
let pFirstEnc = 0;
let pEnc = 0;
let pDec = 0;
let pSteps = 0;
function perfReset(now: number) {
  pStart = now;
  pFirstEnc = 0;
  pEnc = pDec = pSteps = 0;
}
function perfDone(now: number): WorkerPerf {
  return { tStart: pStart, tEnd: now, featureMs: pFirstEnc ? pFirstEnc - pStart : 0, encoderMs: pEnc, decoderMs: pDec, decoderSteps: pSteps };
}
function wrapSessions(a: Asr) {
  for (const [name, sess] of Object.entries(a.model?.sessions ?? {})) {
    const orig = sess.run.bind(sess);
    sess.run = async (...args: unknown[]) => {
      const t = epochNow();
      try {
        return await orig(...args);
      } finally {
        const ms = epochNow() - t;
        if (name === "model" || name.startsWith("encoder")) {
          pEnc += ms;
          if (!pFirstEnc) pFirstEnc = t;
        } else {
          pDec += ms;
          pSteps++;
        }
      }
    };
  }
}

let asr: Asr | null = null;
let loadedRepo = "";

const files = new Map<string, { loaded: number; total: number }>();
function reportProgress(p: { status?: string; file?: string; loaded?: number; total?: number }) {
  if (p.status !== "progress" || !p.file || !p.total) return;
  files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
  let loaded = 0;
  let total = 0;
  for (const f of files.values()) {
    loaded += f.loaded;
    total += f.total;
  }
  ctx.postMessage({ type: "progress", pct: total ? Math.round((loaded / total) * 100) : 0 });
}

ctx.onmessage = async (e: MessageEvent) => {
  const m = e.data as
    | { type: "load"; repo: string; threads?: number; device?: "wasm" | "webgpu"; measure?: boolean }
    | { type: "transcribe"; id: number; audio: Float32Array; language: string };
  try {
    if (m.type === "load") {
      if (!asr || loadedRepo !== m.repo) {
        files.clear();
        // Solo nelle build di prova (?perf=1): più thread e/o WebGPU. Nella build pubblicata questi campi non arrivano mai.
        const webgpu = __ELODICT_TEST_HOOKS__ && m.device === "webgpu";
        if (__ELODICT_TEST_HOOKS__ && m.threads && wasm) wasm.numThreads = m.threads;
        asr = (await pipeline("automatic-speech-recognition", m.repo, {
          dtype: webgpu ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
          device: webgpu ? "webgpu" : "wasm",
          progress_callback: reportProgress,
        } as never)) as unknown as Asr;
        loadedRepo = m.repo;
        if (__ELODICT_TEST_HOOKS__ && m.measure) wrapSessions(asr);
      }
      ctx.postMessage({ type: "ready", repo: m.repo });
    } else if (m.type === "transcribe") {
      if (!asr) throw new Error("modello non caricato");
      if (__ELODICT_TEST_HOOKS__) perfReset(epochNow());
      const out = await asr(m.audio, { language: m.language, task: "transcribe" });
      ctx.postMessage({ type: "result", id: m.id, text: out.text ?? "", ...(__ELODICT_TEST_HOOKS__ ? { perf: perfDone(epochNow()) } : {}) });
    }
  } catch (err) {
    ctx.postMessage({
      type: "error",
      id: "id" in m ? m.id : undefined,
      scope: m.type,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
