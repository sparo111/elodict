// Pesi di Parakeet TDT 0.6B v3 provati in T013b. Le revisioni sono FISSE (hash del commit su Hugging Face), non «main»:
// così la prova di domani misura gli stessi file di oggi. Licenza dei pesi: CC-BY-4.0 (vedi src/attribution.ts).

export type ParakeetWeightsId = "istupakov-int8" | "olicorne-w2a8";

export interface ModelFile {
  /** nome con cui il file viene tenuto (e dato al motore) */
  name: "config.json" | "nemo128.onnx" | "vocab.txt" | "encoder" | "decoder";
  /** percorso nel repository */
  path: string;
  /** peso indicato da Hugging Face alla revisione fissata, in byte */
  bytes: number;
}
export interface ParakeetWeights {
  id: ParakeetWeightsId;
  label: string;
  repo: string;
  /** hash del commit */
  revision: string;
  files: ModelFile[];
  /** il motore adatto: il 2-bit (w2a8) funziona solo su CPU/WebAssembly, secondo chi l'ha pubblicato */
  notes: string;
}

export const PARAKEET_WEIGHTS: Record<ParakeetWeightsId, ParakeetWeights> = {
  "istupakov-int8": {
    id: "istupakov-int8",
    label: "istupakov int8",
    repo: "istupakov/parakeet-tdt-0.6b-v3-onnx",
    revision: "8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce",
    files: [
      { name: "config.json", path: "config.json", bytes: 97 },
      { name: "nemo128.onnx", path: "nemo128.onnx", bytes: 139_764 },
      { name: "vocab.txt", path: "vocab.txt", bytes: 93_939 },
      { name: "encoder", path: "encoder-model.int8.onnx", bytes: 652_183_999 },
      { name: "decoder", path: "decoder_joint-model.int8.onnx", bytes: 18_202_004 },
    ],
    notes: "encoder int8 da 652 MB",
  },
  "olicorne-w2a8": {
    id: "olicorne-w2a8",
    label: "Olicorne redux w2a8",
    repo: "Olicorne/parakeet-tdt-0.6b-v3-redux-onnx",
    revision: "de66c10f18f6d94cb3e910e48034e45ce51109bc",
    files: [
      { name: "config.json", path: "config.json", bytes: 97 },
      { name: "nemo128.onnx", path: "nemo128.onnx", bytes: 139_764 },
      { name: "vocab.txt", path: "vocab.txt", bytes: 93_939 },
      { name: "encoder", path: "w2a8/encoder-model.w2a8.onnx", bytes: 189_893_007 },
      { name: "decoder", path: "int8/decoder_joint-model.int8.onnx", bytes: 18_203_490 },
    ],
    notes: "encoder a 2 bit da 190 MB, solo CPU/WebAssembly",
  },
};

export const fileUrl = (w: ParakeetWeights, f: ModelFile) => `https://huggingface.co/${w.repo}/resolve/${w.revision}/${f.path}`;
export const totalBytes = (w: ParakeetWeights) => w.files.reduce((n, f) => n + f.bytes, 0);
