// Testo di attribuzione (licenza CC-BY-4.0) dei modelli Parakeet. PREPARATO per Impostazioni ma NON ancora mostrato nell'app:
// oggi lo mostra solo la pagina di prova (prova-parakeet/). Quando Parakeet entrerà nell'app, basterà usarlo in Impostazioni.
import type { Lang } from "./commands/types";

export interface Attribution {
  title: string;
  /** una riga per ogni autore, da mostrare come elenco */
  lines: string[];
  license: string;
  licenseUrl: string;
  /** dichiarazione delle modifiche, richiesta da CC-BY-4.0 */
  changes: string;
}

const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const LICENSE = "Creative Commons Attribution 4.0 International (CC-BY-4.0)";

export const ATTRIBUTION: Record<Lang, Attribution> = {
  it: {
    title: "Riconoscimento vocale Parakeet: crediti e licenza",
    lines: [
      "Parakeet TDT 0.6B v3: © NVIDIA, licenza CC-BY-4.0 (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).",
      "Conversione in ONNX (int8): istupakov (https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx), CC-BY-4.0.",
      "Versione «redux» a 1,58 bit: moondream (https://huggingface.co/moondream/parakeet-redux), CC-BY-4.0; conversione in ONNX (w2a8): Olicorne (https://huggingface.co/Olicorne/parakeet-tdt-0.6b-v3-redux-onnx), CC-BY-4.0.",
    ],
    license: LICENSE,
    licenseUrl: LICENSE_URL,
    changes: "I pesi sono stati convertiti nel formato ONNX e quantizzati dagli autori elencati; Elodict li usa così come sono, senza altre modifiche. Gli autori dei modelli non approvano Elodict.",
  },
  en: {
    title: "Parakeet speech recognition: credits and license",
    lines: [
      "Parakeet TDT 0.6B v3: © NVIDIA, CC-BY-4.0 license (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).",
      "ONNX conversion (int8): istupakov (https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx), CC-BY-4.0.",
      "1.58-bit “redux” version: moondream (https://huggingface.co/moondream/parakeet-redux), CC-BY-4.0; ONNX conversion (w2a8): Olicorne (https://huggingface.co/Olicorne/parakeet-tdt-0.6b-v3-redux-onnx), CC-BY-4.0.",
    ],
    license: LICENSE,
    licenseUrl: LICENSE_URL,
    changes: "The weights were converted to ONNX and quantized by the authors listed above; Elodict uses them as they are, with no other changes. The model authors do not endorse Elodict.",
  },
  fr: {
    title: "Reconnaissance vocale Parakeet : crédits et licence",
    lines: [
      "Parakeet TDT 0.6B v3 : © NVIDIA, licence CC-BY-4.0 (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).",
      "Conversion en ONNX (int8) : istupakov (https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx), CC-BY-4.0.",
      "Version « redux » à 1,58 bit : moondream (https://huggingface.co/moondream/parakeet-redux), CC-BY-4.0 ; conversion en ONNX (w2a8) : Olicorne (https://huggingface.co/Olicorne/parakeet-tdt-0.6b-v3-redux-onnx), CC-BY-4.0.",
    ],
    license: LICENSE,
    licenseUrl: LICENSE_URL,
    changes: "Les poids ont été convertis au format ONNX et quantifiés par les auteurs cités ; Elodict les utilise tels quels, sans autre modification. Les auteurs des modèles n'approuvent pas Elodict.",
  },
  es: {
    title: "Reconocimiento de voz Parakeet: créditos y licencia",
    lines: [
      "Parakeet TDT 0.6B v3: © NVIDIA, licencia CC-BY-4.0 (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3).",
      "Conversión a ONNX (int8): istupakov (https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx), CC-BY-4.0.",
      "Versión «redux» de 1,58 bits: moondream (https://huggingface.co/moondream/parakeet-redux), CC-BY-4.0; conversión a ONNX (w2a8): Olicorne (https://huggingface.co/Olicorne/parakeet-tdt-0.6b-v3-redux-onnx), CC-BY-4.0.",
    ],
    license: LICENSE,
    licenseUrl: LICENSE_URL,
    changes: "Los pesos fueron convertidos al formato ONNX y cuantizados por los autores citados; Elodict los usa tal cual, sin otras modificaciones. Los autores de los modelos no respaldan Elodict.",
  },
};
