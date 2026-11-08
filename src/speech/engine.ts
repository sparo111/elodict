// Sceglie quale "orecchio" usare: quello del browser (veloce, serve internet) o il modello offline.
import type { Lang } from "../commands/types";
import { VOICE_CODE } from "../commands";
import { createRecognizer, isSpeechSupported, type Handlers } from "./recognizer";
import { createWhisperEngine, isOfflineSupported, type WhisperModelId } from "./whisper";

export type EngineKind = "browser" | "offline";
export interface Engine {
  start(): void;
  stop(): void;
}

export const isEngineSupported = (kind: EngineKind) => (kind === "offline" ? isOfflineSupported() : isSpeechSupported());

/** `micId`: il microfono scelto. Vale solo per l'ascolto offline: il riconoscimento del browser non permette di sceglierlo. */
export function createEngine(kind: EngineKind, lang: Lang, model: WhisperModelId, h: Handlers, micId = ""): Engine {
  return kind === "offline" ? createWhisperEngine(lang, model, h, micId) : createRecognizer(VOICE_CODE[lang], h);
}
