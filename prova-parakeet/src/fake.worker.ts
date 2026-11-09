// Motore FINTO, solo per le prove automatiche della pagina (?sim=finto,...): attraversa le stesse fasi dei motori veri senza modelli, e può
// bloccarsi o rompersi di proposito, così si prova il diario, i tempi massimi e la cattura degli errori anche con WebKit.
//   finto            va tutto bene (fasi brevi)
//   lento            ogni fase dura 300 ms (per avere il tempo di ricaricare la pagina nel mezzo)
//   hang-download    si ferma, senza dire niente, durante lo scaricamento
//   hang-session     si ferma durante la creazione della sessione
//   hang-run         si ferma durante la trascrizione della prima frase
//   throw            segnala un errore del lavoratore (e va avanti)
//   reject           lascia una promessa rifiutata senza gestirla (unhandledrejection)
//   crash            lancia un'eccezione non gestita
import type { FromWorker, LoadMsg, RunMsg } from "./protocol";
import { installDiagnostics, phase } from "./workerCommon";

const ctx = self as unknown as { postMessage(m: FromWorker): void; onmessage: ((e: MessageEvent<LoadMsg | RunMsg>) => void) | null };
const post = (m: FromWorker) => ctx.postMessage(m);
installDiagnostics(post);

let flags = new Set<string>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hang = () => new Promise<never>(() => undefined);
const step = () => wait(flags.has("lento") ? 300 : 5);

ctx.onmessage = async (e) => {
  const m = e.data;
  if (m.type === "load") {
    flags = new Set((m.sim ?? "").split(",").map((s) => s.trim()));
    const t0 = performance.now();
    const files = ["config.json", "vocab.txt", "encoder-finto.onnx"];
    for (const [i, f] of files.entries()) {
      phase(post, "download", `scaricamento file ${i + 1} di ${files.length}: ${f} (finto)`);
      if (flags.has("hang-download") && i === 1) await hang();
      post({ type: "progress", file: f, loaded: 1_048_576 * (i + 1), total: 3_145_728, index: i + 1, count: files.length });
      await step();
    }
    phase(post, "session", "creazione della sessione onnxruntime (finta)");
    if (flags.has("hang-session")) await hang();
    if (flags.has("throw")) post({ type: "worker-error", kind: "simulato", message: "errore del lavoratore simulato (throw)" });
    if (flags.has("reject")) void Promise.reject(new Error("promessa rifiutata simulata (reject)"));
    if (flags.has("crash")) setTimeout(() => {
      throw new Error("eccezione simulata (crash)");
    }, 20);
    await step();
    post({ type: "loaded", loadMs: performance.now() - t0, networkBytes: 3_145_728, cachedBytes: 0, ep: "finto" });
  } else if (m.type === "run") {
    for (const what of ["preparazione dell'audio (finta)", "encoder (finto)", "decoder (finto)"]) {
      phase(post, "run", what);
      if (flags.has("hang-run")) await hang();
      await step();
    }
    post({ type: "result", id: m.id, text: `frase simulata ${m.id}`, timings: { preMs: 1, encMs: 2, decMs: 3, totalMs: 6, decSteps: 3 } });
  }
};
