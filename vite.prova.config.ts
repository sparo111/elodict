import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { normalizeBase } from "./src/pwa/basePath";

// La pagina di prova T013b (prova-parakeet/) si costruisce a parte e va in dist/prova-parakeet/, DOPO l'app: l'app non cambia.
// Indirizzo: <base dell'app>prova-parakeet/ (per esempio https://sparo111.github.io/elodict/prova-parakeet/).
const base = `${normalizeBase(process.env.VITE_BASE)}prova-parakeet/`;

const ORT24 = "node_modules/onnx-asr-web/node_modules/onnxruntime-web/dist";
// Parakeet (onnx-asr-web) vuole onnxruntime-web 1.24 o più nuovo; l'app usa la 1.22 per Whisper (public/ort), quindi questi sono una copia a parte.
// Whisper (onnxruntime-web 1.22 dell'app): gli stessi quattro file che copia scripts/copy-ort.mjs in public/ort. Servono anche DENTRO la pagina
// (ort22/): con l'isolamento, un lavoratore può partire solo da un file che porta le intestazioni di isolamento, e le mette il service worker
// della pagina, che copre solo la sua cartella.
const ORT22_FILES = ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];
const ORT24_FILES = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"];

/** Mette nella cartella costruita il motore 1.24 e il service worker che isola la pagina (thread multipli). */
function copyRuntime(): Plugin {
  return {
    name: "prova-copy-runtime",
    apply: "build",
    // Le librerie citano i loro file .wasm e Vite li copierebbe tra i file della pagina (50 MB inutili): i motori veri sono
    // quelli indicati con wasmPaths (ort/ dell'app per Whisper, ort24/ per Parakeet), quindi si tolgono.
    generateBundle(_o, bundle) {
      for (const name of Object.keys(bundle)) if (name.endsWith(".wasm")) delete bundle[name];
    },
    closeBundle() {
      const out = path.resolve("dist/prova-parakeet");
      fs.mkdirSync(path.join(out, "ort24"), { recursive: true });
      for (const f of ORT24_FILES) {
        if (!fs.existsSync(`${ORT24}/${f}`)) throw new Error(`manca ${ORT24}/${f}: esegui "npm install"`);
        fs.copyFileSync(`${ORT24}/${f}`, path.join(out, "ort24", f));
      }
      fs.mkdirSync(path.join(out, "ort22"), { recursive: true });
      for (const f of ORT22_FILES) {
        if (!fs.existsSync(`public/ort/${f}`)) throw new Error(`manca public/ort/${f}: esegui "node scripts/copy-ort.mjs"`);
        fs.copyFileSync(`public/ort/${f}`, path.join(out, "ort22", f));
      }
      fs.copyFileSync("node_modules/coi-serviceworker/coi-serviceworker.js", path.join(out, "coi-serviceworker.js"));
    },
  };
}

export default defineConfig({
  root: "prova-parakeet",
  base,
  publicDir: "public",
  plugins: [copyRuntime()],
  worker: { format: "es" },
  build: { outDir: "../dist/prova-parakeet", emptyOutDir: true, target: "es2022", chunkSizeWarningLimit: 4000 },
  optimizeDeps: { exclude: ["@huggingface/transformers", "onnx-asr-web"] },
});
