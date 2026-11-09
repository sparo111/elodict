// Whisper base come lo usa l'app (stessi pesi Xenova/whisper-base, q8, onnxruntime-web 1.22 dell'app), con i tempi misurati
// nelle sessioni del motore: l'encoder e il decoder.
import { env, pipeline } from "@huggingface/transformers";
import { counted } from "../../src/speech/parakeet/download";
import type { FromWorker, LoadMsg, RunMsg, Timings } from "./protocol";
import { describe, installDiagnostics, phase } from "./workerCommon";

const ctx = self as unknown as { postMessage(m: FromWorker): void; onmessage: ((e: MessageEvent<LoadMsg | RunMsg>) => void) | null };
const post = (m: FromWorker) => ctx.postMessage(m);
installDiagnostics(post);
let decoderPhasePosted = false;

type Asr = ((audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string }>) & {
  model: { sessions: Record<string, { run: (...a: unknown[]) => Promise<unknown> }> };
};
let asr: Asr | null = null;
let enc = 0;
let dec = 0;
let steps = 0;
let firstEncoderAt = 0;

// byte che passano davvero dalla rete (la memoria «Cache» di Transformers.js non passa da qui)
let networkBytes = 0;
const realFetch = self.fetch.bind(self);
self.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await realFetch(input, init);
  return res.ok && res.body ? counted(res, (n) => (networkBytes += n)) : res;
};

ctx.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") {
      const t0 = performance.now();
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      const wasm = env.backends.onnx.wasm as { wasmPaths?: string; numThreads?: number };
      wasm.wasmPaths = m.ortWhisper;
      wasm.numThreads = m.threads;
      const files = new Map<string, { loaded: number; total: number }>();
      phase(post, "download", "scaricamento dei file di Whisper base (Transformers.js)");
      const webgpu = m.backend === "webgpu";
      phase(post, "session", `creazione della pipeline Whisper e delle sessioni onnxruntime (${m.threads} thread, ${m.backend})`);
      asr = (await pipeline("automatic-speech-recognition", "Xenova/whisper-base", {
        // come l'app: q8 su WebAssembly. Su WebGPU l'encoder in fp32 e il decoder q4 (la combinazione consigliata da Transformers.js)
        dtype: webgpu ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
        device: webgpu ? "webgpu" : "wasm",
        progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === "progress" && p.file && p.total) {
            if (!files.has(p.file)) phase(post, "download", `scaricamento file ${files.size + 1}: ${p.file}`);
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
            post({ type: "progress", file: p.file, loaded: p.loaded ?? 0, total: p.total, index: files.size });
          }
        },
      } as never)) as unknown as Asr;
      // avvolge le sessioni del motore per misurare encoder e decoder
      for (const [name, s] of Object.entries(asr.model.sessions)) {
        const orig = s.run.bind(s);
        s.run = async (...a: unknown[]) => {
          const t = performance.now();
          const isEnc = name === "model" || name.startsWith("encoder");
          if (isEnc) phase(post, "run", "encoder");
          else if (!decoderPhasePosted) {
            decoderPhasePosted = true;
            phase(post, "run", "decoder (generazione del testo)");
          }
          try {
            return await orig(...a);
          } finally {
            const ms = performance.now() - t;
            // in Transformers.js l'encoder di Whisper si chiama «model» (o «encoder_model»); il decoder «decoder_model_merged»
            if (name === "model" || name.startsWith("encoder")) {
              enc += ms;
              if (!firstEncoderAt) firstEncoderAt = t;
            } else {
              dec += ms;
              steps++;
            }
          }
        };
      }
      post({ type: "loaded", loadMs: performance.now() - t0, networkBytes, cachedBytes: 0, ep: webgpu ? "webgpu" : "wasm" });
    } else if (m.type === "run") {
      if (!asr) throw new Error("modello non caricato");
      enc = dec = steps = 0;
      firstEncoderAt = 0;
      decoderPhasePosted = false;
      phase(post, "run", "preparazione dell'audio (spettro log-mel)");
      const t0 = performance.now();
      const out = await asr(m.samples, { language: "italian", task: "transcribe" });
      const total = performance.now() - t0;
      const timings: Timings = {
        // dall'inizio al primo encoder: lo spettro log-mel in JavaScript
        preMs: firstEncoderAt ? firstEncoderAt - t0 : 0,
        encMs: enc,
        decMs: dec,
        totalMs: total,
        decSteps: steps,
      };
      post({ type: "result", id: m.id, text: out.text ?? "", timings });
    }
  } catch (err) {
    post({ type: "error", id: "id" in m ? m.id : undefined, message: `${describe(err)}${err instanceof Error && err.stack ? `
${err.stack.slice(0, 600)}` : ""}` });
  }
};
