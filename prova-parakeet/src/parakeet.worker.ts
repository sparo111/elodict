// Parakeet TDT 0.6B v3 (onnx-asr-web), con i pesi scelti. Stessa cosa che farebbe l'app: l'audio entra già a 16 kHz.
import { loadParakeet, type ParakeetEngine } from "../../src/speech/parakeet/parakeet";
import type { ParakeetWeightsId } from "../../src/speech/parakeet/models";
import type { FromWorker, LoadMsg, RunMsg } from "./protocol";
import { describe, installDiagnostics, phase } from "./workerCommon";

const ctx = self as unknown as { postMessage(m: FromWorker): void; onmessage: ((e: MessageEvent<LoadMsg | RunMsg>) => void) | null };
const post = (m: FromWorker) => ctx.postMessage(m);
installDiagnostics(post);
let engine: ParakeetEngine | null = null;

ctx.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "load") {
      const weights: ParakeetWeightsId = m.engine === "parakeet-istupakov-int8" ? "istupakov-int8" : "olicorne-w2a8";
      engine = await loadParakeet({
        weights,
        wasmPaths: m.ortParakeet,
        threads: m.threads,
        backend: m.backend,
        lowMemory: m.lowMem,
        onPhase: (kind, text) => phase(post, kind, text),
        onProgress: (loaded, total, file, index, count) => post({ type: "progress", file, loaded, total, index, count }),
      });
      post({ type: "loaded", loadMs: engine.loadMs, networkBytes: engine.stats.networkBytes, cachedBytes: engine.stats.cachedBytes, ep: m.backend });
    } else if (m.type === "run") {
      if (!engine) throw new Error("modello non caricato");
      const r = await engine.transcribe(m.samples);
      post({ type: "result", id: m.id, text: r.text, timings: { ...r.timings, decSteps: 0 } });
    }
  } catch (err) {
    post({ type: "error", id: "id" in m ? m.id : undefined, message: `${describe(err)}${err instanceof Error && err.stack ? `\n${err.stack.slice(0, 600)}` : ""}` });
  }
};
