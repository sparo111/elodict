// Lavoratore in background: carica il modello Whisper e trascrive. Gira nel browser, niente server.
import { env, pipeline } from "@huggingface/transformers";
import { ortBaseUrl } from "../pwa/basePath";

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
type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<Out>;

const ctx = self as unknown as {
  postMessage(m: unknown, transfer?: Transferable[]): void;
  onmessage: ((e: MessageEvent) => void) | null;
};

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
    | { type: "load"; repo: string }
    | { type: "transcribe"; id: number; audio: Float32Array; language: string };
  try {
    if (m.type === "load") {
      if (!asr || loadedRepo !== m.repo) {
        files.clear();
        asr = (await pipeline("automatic-speech-recognition", m.repo, {
          dtype: "q8",
          device: "wasm",
          progress_callback: reportProgress,
        } as never)) as unknown as Asr;
        loadedRepo = m.repo;
      }
      ctx.postMessage({ type: "ready", repo: m.repo });
    } else if (m.type === "transcribe") {
      if (!asr) throw new Error("modello non caricato");
      const out = await asr(m.audio, { language: m.language, task: "transcribe" });
      ctx.postMessage({ type: "result", id: m.id, text: out.text ?? "" });
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
