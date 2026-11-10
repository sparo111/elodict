// Sceglie quale "orecchio" usare: quello del browser (veloce, serve internet), Whisper offline, o Parakeet offline («Privato preciso»).
import type { Lang } from "../commands/types";
import { VOICE_CODE } from "../commands";
import { createRecognizer, isSpeechSupported, type Handlers } from "./recognizer";
import { createWhisperEngine, isOfflineSupported, releaseWhisper, type WhisperModelId } from "./whisper";
import { createParakeetEngine, isParakeetSupported, releaseParakeet } from "./parakeetEngine";

export type EngineKind = "browser" | "offline" | "parakeet";
export interface Engine {
  start(): void;
  stop(): void;
}

export const isEngineSupported = (kind: EngineKind) =>
  kind === "offline" ? isOfflineSupported() : kind === "parakeet" ? isParakeetSupported() : isSpeechSupported();

/** `micId`: il microfono scelto. Vale solo per l'ascolto offline: il riconoscimento del browser non permette di sceglierlo. */
export function createEngine(kind: EngineKind, lang: Lang, model: WhisperModelId, h: Handlers, micId = ""): Engine {
  // In memoria c'è un solo modello alla volta: quello che non serve più si chiude e la sua memoria torna libera
  // (il modello scaricato resta nella memoria del browser e si ricarica quando serve).
  if (kind !== "offline") releaseWhisper();
  if (kind !== "parakeet") releaseParakeet();
  if (kind === "parakeet") return createParakeetEngine(lang, h, micId);
  return kind === "offline" ? createWhisperEngine(lang, model, h, micId) : createRecognizer(VOICE_CODE[lang], h);
}

// Solo nelle build di prova: serve alle prove nel browser per far trascrivere un file audio ai due riconoscitori senza microfono.
if (__ELODICT_TEST_HOOKS__) void import("./testHooks");
