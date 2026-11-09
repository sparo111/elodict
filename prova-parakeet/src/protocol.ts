// Messaggi tra la pagina e i lavoratori (uno per motore). Ogni configurazione di prova gira in un lavoratore nuovo, che si chiude alla fine:
// così la memoria torna libera e una prova non influenza la successiva.

export type EngineKind = "whisper-base" | "parakeet-istupakov-int8" | "parakeet-olicorne-w2a8";
export type Backend = "wasm" | "webgpu";

export interface LoadMsg {
  type: "load";
  engine: EngineKind;
  threads: number;
  backend: Backend;
  /** indirizzo dei file di onnxruntime-web 1.22 (Whisper: sono quelli dell'app, ../ort/) */
  ortWhisper: string;
  /** indirizzo dei file di onnxruntime-web 1.24+ (Parakeet: ort24/) */
  ortParakeet: string;
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

export type FromWorker =
  | { type: "progress"; file: string; loaded: number; total: number }
  | { type: "loaded"; loadMs: number; networkBytes: number; cachedBytes: number; ep: string }
  | { type: "result"; id: number; text: string; timings: Timings }
  | { type: "error"; id?: number; message: string };
