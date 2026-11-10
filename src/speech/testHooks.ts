// Solo nelle build di prova (non esiste in quella pubblicata): window.__elodictTranscribe(motore, campioni a 16 kHz, lingua)
// carica il modello del motore (chiudendo l'altro, come fa l'app) e restituisce il testo pulito. Serve alle prove nel browser.
import type { Lang } from "../commands/types";
import { prepareModel, releaseWhisper, transcribeWhisper } from "./whisper";
import { cleanWhisperText } from "./segmenter";
import { prepareParakeet, releaseParakeet, transcribeParakeet } from "./parakeetEngine";
import { cleanParakeetText } from "./parakeet/clean";

(window as unknown as Record<string, unknown>).__elodictTranscribe = async (engine: "offline" | "parakeet", samples: Float32Array, lang: Lang = "it") => {
  if (engine === "parakeet") {
    releaseWhisper();
    await prepareParakeet();
    return cleanParakeetText(await transcribeParakeet(samples));
  }
  releaseParakeet();
  await prepareModel("tiny");
  return cleanWhisperText(await transcribeWhisper(samples, lang));
};
