// Copia i file del motore WebAssembly nella cartella pubblica, così il sito non carica codice da siti esterni.
// Due copie SEPARATE, perché i due riconoscitori vogliono versioni diverse di onnxruntime-web (T013d):
//   public/ort    → 1.22 (quella di @huggingface/transformers): Whisper
//   public/ort31  → 1.31 (quella di onnx-asr-web, che vuole la 1.24 o più nuova): Parakeet «Privato preciso»
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const files = [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];
const copies = [
  { src: "node_modules/onnxruntime-web/dist", dst: "public/ort" },
  { src: "node_modules/onnx-asr-web/node_modules/onnxruntime-web/dist", dst: "public/ort31" },
];

for (const { src, dst } of copies) {
  mkdirSync(dst, { recursive: true });
  for (const f of files) {
    if (!existsSync(`${src}/${f}`)) {
      console.error(`Manca ${src}/${f}: esegui "npm install".`);
      process.exit(1);
    }
    copyFileSync(`${src}/${f}`, `${dst}/${f}`);
  }
  console.log(`copiati ${files.length} file in ${dst}`);
}
