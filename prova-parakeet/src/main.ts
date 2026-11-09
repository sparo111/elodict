// Pagina di prova T013b: misura Whisper base (come nell'app) e Parakeet TDT 0.6B v3 con le stesse frasi registrate.
// Non fa parte dell'app e l'app non ha collegamenti a questa pagina. Funziona anche da sola su un telefono vero.
import { decodeWavPcm16 } from "../../src/speech/parakeet/wav";
import { scoreText, type TextScore } from "../../src/speech/parakeet/metrics";
import { runSweep, type SweepResult } from "../../src/speech/parakeet/sweep";
import { PARAKEET_WEIGHTS, totalBytes } from "../../src/speech/parakeet/models";
import { ATTRIBUTION } from "../../src/attribution";
import type { Backend, EngineKind, FromWorker, PhaseKind, Timings } from "./protocol";
import { finishJournal, interruptedReport, journalError, journalPageEvent, markPhase, navType, readJournal, startJournal } from "./journal";

const BASE = new URL("./", location.href).href; // .../prova-parakeet/
const ORT_WHISPER = `${BASE}ort22/`; // gli stessi file di public/ort dell'app (onnxruntime-web 1.22), copiati dentro la pagina
const ORT_PARAKEET = `${BASE}ort24/`;

/* ---------- opzioni dall'indirizzo (per le prove automatiche e per chi vuole cambiare i limiti) ---------- */
const Q = new URLSearchParams(location.search);
/** ?sim=finto,lento,hang-session…: i motori veri sono sostituiti dal motore finto (vedi fake.worker.ts) */
const SIM = Q.get("sim");
const seconds = (name: string, def: number) => (Number(Q.get(name)) > 0 ? Number(Q.get(name)) : def) * 1000;
/** tempo massimo per fase: scaricamento 10 minuti, sessione 2 minuti, frase 2 minuti (?t_download=, ?t_session=, ?t_run= in secondi) */
const LIMITS: Record<PhaseKind, number> = { download: seconds("t_download", 600), session: seconds("t_session", 120), run: seconds("t_run", 120) };

export interface Phrase {
  id: number;
  circaSecondi: number;
  testo: string;
  samples: Float32Array;
  seconds: number;
}
export interface Config {
  engine: EngineKind;
  threads: number;
  backend: Backend;
  /** modalità a poca memoria (solo Parakeet) */
  lowMem?: boolean;
}
export interface Row extends Config {
  label: string;
  ok: boolean;
  error?: string;
  /** la fase in cui si è fermata (se è andata male) */
  errorPhase?: string;
  /** tutti gli errori visti dal lavoratore e da onnxruntime, con il messaggio completo */
  errors: string[];
  /** avvisi ed errori scritti nella console del lavoratore */
  logs: string[];
  loadMs: number;
  networkMB: number;
  cachedMB: number;
  /** memoria massima letta dalla pagina durante la prova (MB), se il browser la dà */
  peakMemMB: number | null;
  memSource: string;
  /** prima trascrizione, a freddo (frase 2), non conteggiata nelle medie */
  coldMs: number | null;
  clips: {
    id: number;
    seconds: number;
    timings: Timings;
    text: string;
    score: TextScore;
  }[];
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const rows: Row[] = [];
let phrases: Phrase[] = [];
let sweeps: SweepResult[] = [];
/** il rapporto sull'ultima prova rimasta a metà (letto dal diario all'avvio), se c'è */
let interrupted: string | null = null;
let probe: Record<string, string | boolean> | null = null;
const pageErrors: string[] = [];
const MB = 1024 * 1024;

/* ---------- dispositivo ---------- */
export async function deviceInfo() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { brands?: { brand: string; version: string }[]; platform?: string; getHighEntropyValues?: (h: string[]) => Promise<Record<string, string>> };
    gpu?: { requestAdapter(): Promise<{ info?: Record<string, string>; requestAdapterInfo?: () => Promise<Record<string, string>> } | null> };
  };
  const info: Record<string, string | number | boolean | undefined> = {
    userAgent: navigator.userAgent,
    platform: nav.userAgentData?.platform ?? navigator.platform,
    cores: navigator.hardwareConcurrency,
    deviceMemoryGB: nav.deviceMemory,
    crossOriginIsolated: self.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    webgpu: !!nav.gpu,
  };
  try {
    const hi = await nav.userAgentData?.getHighEntropyValues?.(["model", "platformVersion", "architecture"]);
    if (hi) Object.assign(info, { model: hi.model || undefined, platformVersion: hi.platformVersion, architecture: hi.architecture });
  } catch {
    /* il dato non c'è */
  }
  try {
    const ad = await nav.gpu?.requestAdapter();
    if (ad) {
      const gi = ad.info ?? (await ad.requestAdapterInfo?.());
      info.webgpuAdapter = gi ? [gi.vendor, gi.architecture, gi.description].filter(Boolean).join(" / ") || "sì" : "sì";
    } else if (nav.gpu) info.webgpuAdapter = "nessun adattatore";
  } catch (e) {
    info.webgpuAdapter = `errore: ${(e as Error).message}`;
  }
  return info;
}

/* ---------- audio e frasi ---------- */
async function loadPhrases(): Promise<Phrase[]> {
  const meta = await (await fetch(`${BASE}frasi.json`)).json();
  const out: Phrase[] = [];
  for (const f of meta.frasi as { id: number; circa_secondi: number; testo: string }[]) {
    const wav = decodeWavPcm16(await (await fetch(`${BASE}audio/frase-${f.id}.wav`)).arrayBuffer());
    out.push({ id: f.id, circaSecondi: f.circa_secondi, testo: f.testo, samples: wav.samples, seconds: wav.samples.length / wav.sampleRate });
  }
  return out;
}

/* ---------- memoria ---------- */
async function readMemory(): Promise<{ bytes: number; source: string } | null> {
  const p = performance as Performance & { measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>; memory?: { usedJSHeapSize: number } };
  try {
    if (self.crossOriginIsolated && p.measureUserAgentSpecificMemory) return { bytes: (await p.measureUserAgentSpecificMemory()).bytes, source: "measureUserAgentSpecificMemory (pagina e lavoratori)" };
  } catch {
    /* non disponibile in questo momento */
  }
  if (p.memory) return { bytes: p.memory.usedJSHeapSize, source: "performance.memory (solo la pagina, senza il WebAssembly dei lavoratori)" };
  return null;
}

/* ---------- una configurazione ---------- */
export const label = (c: Config) => `${c.engine} · ${c.threads} thread · ${c.backend}${c.lowMem ? " · poca memoria" : ""}`;

/** Il lavoratore giusto per il motore (due `new Worker(new URL(...))` scritti per esteso: Vite li riconosce solo così). */
function makeWorker(engine: EngineKind): Worker {
  if (SIM) return new Worker(new URL("./fake.worker.ts", import.meta.url), { type: "module" });
  return engine === "whisper-base" ? new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" }) : new Worker(new URL("./parakeet.worker.ts", import.meta.url), { type: "module" });
}

const KIND_NAME: Record<PhaseKind, string> = { download: "scaricamento", session: "creazione della sessione", run: "frase" };

export async function runConfig(cfg: Config, onStatus: (s: string) => void = () => undefined): Promise<Row> {
  const row: Row = { ...cfg, label: label(cfg), ok: false, errors: [], logs: [], loadMs: 0, networkMB: 0, cachedMB: 0, peakMemMB: null, memSource: "n/d", coldMs: null, clips: [] };
  const note = (s: string) => {
    if (row.errors.length < 40) row.errors.push(s);
    journalError(`${cfg.engine}: ${s}`);
  };

  /* il tempo massimo di ogni fase: se scade, la prova segna ERRORE con la fase e la pagina va avanti con la prossima */
  let timer: ReturnType<typeof setTimeout> | undefined;
  let curPhase = "avvio";
  let curKind: PhaseKind = "session";
  let abort!: (e: Error) => void;
  const aborted = new Promise<never>((_, rej) => {
    abort = rej;
  });
  aborted.catch(() => undefined);
  const arm = () => {
    clearTimeout(timer);
    const limit = LIMITS[curKind];
    timer = setTimeout(() => abort(new Error(`tempo scaduto (${limit / 1000} s, limite per «${KIND_NAME[curKind]}») nella fase «${curPhase}»`)), limit);
  };
  const enter = (kind: PhaseKind, text: string) => {
    curKind = kind;
    curPhase = text;
    markPhase(cfg, text); // PRIMA di entrare nella fase: se la pagina muore qui, il diario dice dove
    onStatus(`${label(cfg)}: ${text}`);
    arm();
  };
  const guard = <T,>(p: Promise<T>) => Promise.race([p, aborted]);

  let worker: Worker | null = null;
  const waiters = new Map<number, (m: FromWorker) => void>();
  let loaded: ((m: FromWorker) => void) | null = null;
  let lastMarkedMB = -100;
  let lastFile = "";

  let peak = 0;
  let memSource = "n/d";
  let sampling = true;
  const sampler = (async () => {
    while (sampling) {
      const r = await readMemory();
      if (r) {
        peak = Math.max(peak, r.bytes);
        memSource = r.source;
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
  })();

  try {
    enter("session", "avvio del lavoratore");
    worker = makeWorker(cfg.engine);
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      const m = e.data;
      if (m.type === "phase") enter(m.kind, m.phase);
      else if (m.type === "progress") {
        const mb = m.loaded / MB;
        const text = `scaricamento file ${m.index ?? "?"}${m.count ? ` di ${m.count}` : ""}: ${m.file} (${mb.toFixed(0)}/${(m.total / MB).toFixed(0)} MB)`;
        onStatus(`${label(cfg)}: ${text}`);
        // il diario si aggiorna a ogni file nuovo e ogni 20 MB; ogni avanzamento rimette a zero il tempo massimo dello scaricamento
        if (m.file !== lastFile || mb - lastMarkedMB >= 20) {
          lastFile = m.file;
          lastMarkedMB = mb;
          curPhase = text;
          markPhase(cfg, text);
        }
        if (curKind === "download") arm();
      } else if (m.type === "worker-error") note(`[lavoratore ${m.kind}] ${m.message}${m.stack ? ` | ${m.stack.split("\n").slice(0, 3).join(" ¦ ")}` : ""}`);
      else if (m.type === "log") {
        const line = `${m.level}: ${m.text}`;
        if (row.logs.length < 60 && !row.logs.includes(line)) row.logs.push(line); // le righe uguali si scrivono una volta sola
      } else if (m.type === "loaded" || (m.type === "error" && m.id === undefined)) loaded?.(m);
      else if ((m.type === "result" || m.type === "error") && m.id !== undefined) waiters.get(m.id)?.(m);
    };
    // un errore che ferma il lavoratore (anche il caricamento di un file .wasm/.mjs): messaggio, file, riga
    worker.onerror = (e) => {
      const msg = `errore del lavoratore: ${e.message || "(senza messaggio)"} (${e.filename || "?"}:${e.lineno}:${e.colno})`;
      note(msg);
      abort(new Error(msg));
    };
    worker.onmessageerror = () => note("messaggio del lavoratore non leggibile (messageerror)");

    const l = await guard(
      new Promise<FromWorker>((res) => {
        loaded = res;
        enter("session", "invio del comando di caricamento al lavoratore");
        worker!.postMessage({ type: "load", engine: cfg.engine, threads: cfg.threads, backend: cfg.backend, ortWhisper: ORT_WHISPER, ortParakeet: ORT_PARAKEET, lowMem: cfg.lowMem, sim: SIM ?? undefined });
      }),
    );
    if (l.type === "error") throw new Error(l.message);
    if (l.type !== "loaded") throw new Error("risposta inattesa");
    row.loadMs = l.loadMs;
    row.networkMB = l.networkBytes / MB;
    row.cachedMB = l.cachedBytes / MB;

    let nextId = 1;
    const run = (samples: Float32Array) =>
      new Promise<{ text: string; timings: Timings }>((resolve, reject) => {
        const id = nextId++;
        waiters.set(id, (m) => (m.type === "result" ? resolve({ text: m.text, timings: m.timings }) : reject(new Error(m.type === "error" ? m.message : "errore"))));
        worker!.postMessage({ type: "run", id, samples: samples.slice() });
      });

    const warm = phrases.find((p) => p.id === 2) ?? phrases[0];
    enter("run", `prima trascrizione, a freddo (frase ${warm.id}): invio al motore`);
    row.coldMs = (await guard(run(warm.samples))).timings.totalMs;
    for (const p of phrases) {
      enter("run", `frase ${p.id}/${phrases.length} (${p.seconds.toFixed(1)} s): invio al motore`);
      const r = await guard(run(p.samples));
      row.clips.push({ id: p.id, seconds: p.seconds, timings: r.timings, text: r.text.trim(), score: scoreText(p.testo, r.text) });
    }
    row.ok = true;
  } catch (e) {
    row.error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    row.errorPhase = curPhase;
    note(`ERRORE nella fase «${curPhase}»: ${row.error}`);
  } finally {
    clearTimeout(timer);
    sampling = false;
    await sampler;
    const last = await readMemory();
    if (last) {
      peak = Math.max(peak, last.bytes);
      memSource = last.source;
    }
    row.peakMemMB = peak ? peak / MB : null;
    row.memSource = memSource;
    worker?.terminate();
  }
  return row;
}

/* ---------- sonda del dispositivo: quello che il browser sa fare, e un piccolo assaggio di memoria ---------- */
export function probeDevice(): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const valid = (bytes: number[]) => {
    try {
      return WebAssembly.validate(new Uint8Array(bytes));
    } catch {
      return false;
    }
  };
  out.wasmSimd = valid([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
  out.wasmEccezioni = valid([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 6, 64, 25, 11, 11]);
  try {
    const m = new WebAssembly.Memory({ initial: 4096, maximum: 4096 }); // 256 MB
    out.memoriaWasm256MB = m.buffer.byteLength === 4096 * 65536 ? "ok" : "strana";
  } catch (e) {
    out.memoriaWasm256MB = `ERRORE ${(e as Error).message}`;
  }
  try {
    out.arrayBuffer128MB = new ArrayBuffer(128 * MB).byteLength === 128 * MB ? "ok" : "strano";
  } catch (e) {
    out.arrayBuffer128MB = `ERRORE ${(e as Error).message}`;
  }
  out.apertaCome = navType();
  return out;
}

/* ---------- pausa che chiude la frase ---------- */
export async function runSweeps(): Promise<SweepResult[]> {
  const wav = decodeWavPcm16(await (await fetch(`${BASE}audio/pause-naturali.wav`)).arrayBuffer());
  return [400, 550, 700].map((ms) => runSweep(wav.samples, ms, 6));
}

/* ---------- tabelle ---------- */
const fmt = (n: number, d = 0) => n.toFixed(d);
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function summaryOf(r: Row) {
  const c = r.clips;
  const secs = c.reduce((s, x) => s + x.seconds, 0);
  const total = c.reduce((s, x) => s + x.timings.totalMs, 0);
  const words = c.reduce((s, x) => s + x.score.words, 0);
  const errs = c.reduce((s, x) => s + x.score.errors, 0);
  const pe = c.reduce((s, x) => s + x.score.punctExpected, 0);
  const pc = c.reduce((s, x) => s + x.score.punctCorrect, 0);
  return { rtf: secs ? total / 1000 / secs : 0, wer: words ? errs / words : 0, punct: pe ? pc / pe : 0, meanMs: mean(c.map((x) => x.timings.totalMs)) };
}

export function resultsAsText(info: Record<string, unknown>): string {
  const L: string[] = [];
  L.push("PROVA PARAKEET (T013b/T013c)  " + new Date().toISOString());
  if (interrupted) {
    L.push("");
    L.push("== ULTIMA PROVA INTERROTTA ==");
    L.push(interrupted);
    L.push("");
  }
  L.push("Dispositivo: " + JSON.stringify(info));
  if (probe) L.push("Sonda del dispositivo: " + JSON.stringify(probe));
  if (SIM) L.push("ATTENZIONE: motori simulati (?sim=" + SIM + "), non sono misure vere");
  L.push("Voce delle frasi: sintesi vocale di Windows (Microsoft Elsa, it-IT), NON una voce umana");
  L.push("");
  L.push("== Riassunto (RTF = tempo di calcolo / durata dell'audio; più basso è meglio) ==");
  L.push(["motore", "thread", "backend", "MB scaricati", "MB dalla memoria", "caricamento s", "memoria max MB", "a freddo ms", "RTF", "WER %", "punteggiatura %", "esito"].join("\t"));
  for (const r of rows) {
    const s = summaryOf(r);
    L.push([r.engine, r.threads, r.backend, fmt(r.networkMB), fmt(r.cachedMB), fmt(r.loadMs / 1000, 1), r.peakMemMB === null ? "n/d" : fmt(r.peakMemMB), r.coldMs === null ? "n/d" : fmt(r.coldMs), fmt(s.rtf, 2), fmt(s.wer * 100, 1), fmt(s.punct * 100), r.ok ? "ok" : "ERRORE: " + r.error].join("\t"));
  }
  L.push("");
  L.push("== Per frase (ms) ==");
  L.push(["motore", "thread", "backend", "frase", "audio s", "preparazione", "encoder", "generazione", "totale", "passi decoder", "WER %", "testo"].join("\t"));
  for (const r of rows)
    for (const c of r.clips) L.push([r.engine, r.threads, r.backend, c.id, fmt(c.seconds, 1), fmt(c.timings.preMs), fmt(c.timings.encMs), fmt(c.timings.decMs), fmt(c.timings.totalMs), c.timings.decSteps, fmt(c.score.wer * 100, 1), c.text].join("\t"));
  L.push("");
  L.push("== Errori e messaggi (completi) ==");
  for (const r of rows) {
    if (r.ok && !r.errors.length && !r.logs.length) continue;
    L.push(`${label(r)}: ${r.ok ? "ok" : `ERRORE nella fase «${r.errorPhase}»: ${r.error}`}`);
    for (const e of r.errors) L.push("  - " + e);
    for (const l of r.logs) L.push("  · console " + l);
  }
  for (const e of pageErrors) L.push("pagina: " + e);
  if (!rows.some((r) => !r.ok || r.errors.length || r.logs.length) && !pageErrors.length) L.push("(nessuno)");
  L.push("");
  L.push("== Pausa che chiude la frase (audio con 6 pause dentro la frase da 350 a 800 ms) ==");
  for (const s of sweeps) L.push(`silenceMs ${s.silenceMs}: frasi emesse ${s.emitted} (volute ${s.expected}), tagliate a metà ${s.splits}, ritardo medio ${fmt(s.meanDelayMs)} ms`);
  return L.join("\n");
}

function render(info: Record<string, unknown>) {
  const sum = rows
    .map((r) => {
      const s = summaryOf(r);
      return `<tr class="${r.ok ? "" : "bad"}"><td>${esc(r.engine)}${r.lowMem ? " (poca memoria)" : ""}</td><td>${r.threads}</td><td>${r.backend}</td><td>${fmt(r.networkMB)}${r.cachedMB ? ` (+${fmt(r.cachedMB)} già salvati)` : ""}</td><td>${fmt(r.loadMs / 1000, 1)}</td><td>${r.peakMemMB === null ? "n/d" : fmt(r.peakMemMB)}</td><td>${r.coldMs === null ? "n/d" : fmt(r.coldMs)}</td><td>${r.ok ? fmt(s.rtf, 2) : "—"}</td><td>${r.ok ? fmt(s.wer * 100, 1) : "—"}</td><td>${r.ok ? fmt(s.punct * 100) : "—"}</td><td>${r.ok ? "ok" : `ERRORE (fase «${esc(r.errorPhase ?? "?")}»): ${esc(r.error ?? "errore")}`}</td></tr>`;
    })
    .join("");
  const det = rows
    .filter((r) => r.ok)
    .flatMap((r) => r.clips.map((c) => `<tr><td>${esc(r.engine)} ${r.threads}t ${r.backend}</td><td>${c.id}</td><td>${fmt(c.seconds, 1)}</td><td>${fmt(c.timings.preMs)}</td><td>${fmt(c.timings.encMs)}</td><td>${fmt(c.timings.decMs)}</td><td><b>${fmt(c.timings.totalMs)}</b></td><td>${fmt(c.score.wer * 100, 1)}</td><td class="txt">${esc(c.text)}</td></tr>`))
    .join("");
  const sw = sweeps.map((s) => `<tr><td>${s.silenceMs}</td><td>${s.emitted} / ${s.expected}</td><td>${s.splits}</td><td>${fmt(s.meanDelayMs)}</td></tr>`).join("");
  $("tables").innerHTML = `
    <h2>Riassunto</h2><div class="scroll"><table><thead><tr><th>Motore</th><th>Thread</th><th>Backend</th><th>MB scaricati</th><th>Caricamento s</th><th>Memoria max MB</th><th>A freddo ms</th><th>RTF</th><th>WER %</th><th>Punteggiatura %</th><th>Esito</th></tr></thead><tbody>${sum}</tbody></table></div>
    <h2>Per frase (ms)</h2><div class="scroll"><table><thead><tr><th>Configurazione</th><th>Frase</th><th>Audio s</th><th>Preparaz.</th><th>Encoder</th><th>Generaz.</th><th>Totale</th><th>WER %</th><th>Testo</th></tr></thead><tbody>${det}</tbody></table></div>
    <h2>Pausa che chiude la frase</h2><div class="scroll"><table><thead><tr><th>silenceMs</th><th>Frasi emesse / volute</th><th>Tagliate a metà</th><th>Ritardo medio ms</th></tr></thead><tbody>${sw}</tbody></table></div>`;
  $<HTMLTextAreaElement>("copy-box").value = resultsAsText(info);
  (window as unknown as { __rows: Row[] }).__rows = rows;
}

/* ---------- avvio ---------- */
async function main() {
  // errori della pagina e movimenti della pagina (chiusura, ricaricamento) nel diario
  window.addEventListener("error", (e) => {
    const m = `errore: ${e.message} (${e.filename}:${e.lineno}:${e.colno})`;
    pageErrors.push(m);
    journalError(`pagina ${m}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as Error | undefined;
    const m = `promessa rifiutata: ${r instanceof Error ? `${r.name}: ${r.message}` : String(e.reason)}`;
    pageErrors.push(m);
    journalError(`pagina ${m}`);
  });
  document.addEventListener("visibilitychange", () => journalPageEvent(`visibilità: ${document.visibilityState}`));
  window.addEventListener("pagehide", (e) => journalPageEvent(`pagehide (persisted=${e.persisted})`));

  // una prova rimasta a metà l'ultima volta? Si legge PRIMA di toccare il diario
  interrupted = interruptedReport(readJournal());
  const info = await deviceInfo();
  if (interrupted) {
    $("interrupted").hidden = false;
    $("interrupted-text").textContent = `${interrupted}
Questa pagina è stata appena aperta come: ${navType()} (reload = ricaricata; navigate = aperta di nuovo)`;
    interrupted += `
Questa pagina è stata appena aperta come: ${navType()}`;
    // se era ferma con Parakeet, la volta dopo si propone la modalità a poca memoria
    const last = readJournal()?.last;
    if (last?.engine.startsWith("parakeet")) ($("opt-lowmem") as HTMLInputElement).checked = true;
    $("copy").hidden = false;
    $<HTMLTextAreaElement>("copy-box").value = resultsAsText(info);
  }
  $("device").textContent = Object.entries(info).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}: ${v}`).join(" · ");
  const attr = ATTRIBUTION.it;
  $("attribution").innerHTML = `<h2>${esc(attr.title)}</h2><ul>${attr.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul><p>Licenza: <a href="${attr.licenseUrl}">${esc(attr.license)}</a>. ${esc(attr.changes)}</p>`;
  const big = PARAKEET_WEIGHTS["istupakov-int8"];
  const small = PARAKEET_WEIGHTS["olicorne-w2a8"];
  $("sizes").textContent = `Scaricherai circa ${fmt((totalBytes(small) + 145_000_000) / MB)} MB (Whisper base ~145 MB + Parakeet w2a8 ~${fmt(totalBytes(small) / MB)} MB) la prima volta; con la casella «modello grande» altri ${fmt(totalBytes(big) / MB)} MB. Usa il Wi-Fi.`;
  if (!info.webgpu) ($("opt-webgpu") as HTMLInputElement).disabled = true;
  const thr = $("opt-threads") as HTMLInputElement;
  if (self.crossOriginIsolated) thr.checked = true;
  else {
    thr.disabled = true;
    $("iso-note").textContent = "I thread multipli non sono disponibili in questo browser (la pagina non è isolata): si prova con 1 thread.";
  }
  phrases = await loadPhrases();
  $("phrases").textContent = phrases.map((p) => `${p.id}. (${p.seconds.toFixed(1)} s) ${p.testo}`).join("\n");

  const status = (s: string) => ($("status").textContent = s);
  const start = $<HTMLButtonElement>("start");
  const startSmall = $<HTMLButtonElement>("start-small");
  start.disabled = false;
  startSmall.disabled = false;

  /** Una prova: azzera il diario, fa la sonda, (se serve) le pause, poi le configurazioni una dopo l'altra, senza mai bloccarsi su una sola. */
  const runAll = async (configs: Config[], withSweeps: boolean) => {
    start.disabled = true;
    startSmall.disabled = true;
    rows.length = 0;
    startJournal();
    markPhase({ engine: "pagina", threads: 0, backend: "-" }, "sonda del dispositivo (WebAssembly e piccola prova di memoria)");
    probe = probeDevice();
    if (withSweeps) {
      markPhase({ engine: "pagina", threads: 0, backend: "-" }, "pausa che chiude la frase (calcolo sul segmentatore)");
      status("Pausa che chiude la frase…");
      sweeps = await runSweeps();
    } else sweeps = [];
    for (const c of configs) {
      rows.push(await runConfig(c, status));
      render(info);
    }
    render(info);
    finishJournal();
    const bad = rows.filter((r) => !r.ok).length;
    status(`Finito${bad ? ` (${bad} prova${bad > 1 ? "e" : ""} con ERRORE: vedi la tabella)` : ""}. Premi «Copia i risultati» e incollali nella chat.`);
    start.disabled = false;
    startSmall.disabled = false;
    $("copy").hidden = false;
  };
  const lowMem = () => ($("opt-lowmem") as HTMLInputElement).checked;
  start.onclick = async () => {
    const cores = navigator.hardwareConcurrency || 2;
    const threadList = self.crossOriginIsolated && ($("opt-threads") as HTMLInputElement).checked ? [1, ...[2, 4].filter((t) => t <= cores)] : [1];
    const wantBig = ($("opt-big") as HTMLInputElement).checked;
    const wantGpu = ($("opt-webgpu") as HTMLInputElement).checked && !!info.webgpu;
    const configs: Config[] = [
      ...threadList.map((t) => ({ engine: "whisper-base" as const, threads: t, backend: "wasm" as const })),
      ...threadList.map((t) => ({ engine: "parakeet-olicorne-w2a8" as const, threads: t, backend: "wasm" as const, lowMem: lowMem() })),
      ...(wantBig ? threadList.map((t) => ({ engine: "parakeet-istupakov-int8" as const, threads: t, backend: "wasm" as const, lowMem: lowMem() })) : []),
      ...(wantGpu ? [{ engine: "whisper-base" as const, threads: 1, backend: "webgpu" as const }] : []),
      // (Parakeet su WebGPU non si prova da qui: in Edge con Intel Arc dava testo vuoto con tutti e due i pesi; vedi AUDIT_T013b.md)
    ];
    await runAll(configs, true);
  };
  // «Prova solo Parakeet piccolo»: salta Whisper e le prove sulle pause (una sola configurazione, 1 thread)
  startSmall.onclick = () => runAll([{ engine: "parakeet-olicorne-w2a8", threads: 1, backend: "wasm", lowMem: lowMem() }], false);
  $<HTMLButtonElement>("copy").onclick = async () => {
    const box = $<HTMLTextAreaElement>("copy-box");
    try {
      await navigator.clipboard.writeText(box.value);
      status("Copiato.");
    } catch {
      box.hidden = false;
      box.select();
      status("Non riesco a copiare da solo: ho selezionato il testo, copialo a mano.");
    }
  };
  // per le prove automatiche (Playwright) e per chi vuole una configurazione sola
  Object.assign(window, {
    __bench: {
      ready: true,
      runConfig: async (cfg: Config) => {
        const r = await runConfig(cfg, status);
        rows.push(r);
        render(info);
        return r;
      },
      runSweeps: async () => (sweeps = await runSweeps()),
      info,
      text: () => resultsAsText(info),
      journal: () => readJournal(),
    },
  });
}
void main();
