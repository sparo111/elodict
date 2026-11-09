// Messaggi tra la pagina e i lavoratori (uno per motore). Ogni configurazione di prova gira in un lavoratore nuovo, che si chiude alla fine:
// così la memoria torna libera e una prova non influenza la successiva.

/** «finto» = motore simulato (solo per le prove automatiche della pagina: ?sim=finto,...) */
export type EngineKind = "whisper-base" | "parakeet-istupakov-int8" | "parakeet-olicorne-w2a8" | "finto";
export type Backend = "wasm" | "webgpu";

export interface LoadMsg {
  type: "load";
  engine: EngineKind;
  threads: number;
  backend: Backend;
  /** indirizzo dei file di onnxruntime-web 1.22 (Whisper: sono quelli dell'app, copiati in ort22/) */
  ortWhisper: string;
  /** indirizzo dei file di onnxruntime-web 1.24+ (Parakeet: ort24/) */
  ortParakeet: string;
  /** modalità a poca memoria per Parakeet: meno ottimizzazioni e niente memoria di riserva (T013c) */
  lowMem?: boolean;
  /** opzioni del motore finto, per esempio «lento,hang-session» */
  sim?: string;
}
export interface RunMsg {
  type: "run";
  id: number;
  samples: Float32Array;
}

export interface Timings {
  /** preparazione dell'audio (Whisper: spettro log-mel in JavaScript; Parakeet: spettro con nemo128) */
  preMs: number;
  /** encoder */
  encMs: number;
  /** generazione del testo (decoder, un passo per parola/pezzetto) */
  decMs: number;
  /** dall'audio al testo, dentro il lavoratore */
  totalMs: number;
  /** quante volte è girato il decoder */
  decSteps: number;
}

/** Il tipo di fase decide il tempo massimo: scaricamento 10 min, sessione 2 min, frase 2 min. */
export type PhaseKind = "download" | "session" | "run";

export type FromWorker =
  | { type: "progress"; file: string; loaded: number; total: number; index?: number; count?: number }
  | { type: "phase"; kind: PhaseKind; phase: string }
  | { type: "loaded"; loadMs: number; networkBytes: number; cachedBytes: number; ep: string }
  | { type: "result"; id: number; text: string; timings: Timings }
  | { type: "error"; id?: number; message: string }
  /** errore visto dentro il lavoratore (eccezione, promessa rifiutata, caricamento di un file fallito), con il messaggio completo */
  | { type: "worker-error"; kind: string; message: string; stack?: string }
  /** avvisi e errori scritti nella console del lavoratore (compresi quelli di onnxruntime) */
  | { type: "log"; level: string; text: string };
