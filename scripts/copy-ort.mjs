// Copia i file del motore WebAssembly nella cartella pubblica, così il sito non carica codice da siti esterni.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const src = "node_modules/onnxruntime-web/dist";
const dst = "public/ort";
const files = [
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];

mkdirSync(dst, { recursive: true });
for (const f of files) {
  if (!existsSync(`${src}/${f}`)) {
    console.error(`Manca ${src}/${f}: esegui "npm install".`);
    process.exit(1);
  }
  copyFileSync(`${src}/${f}`, `${dst}/${f}`);
}
console.log(`copiati ${files.length} file in ${dst}`);
