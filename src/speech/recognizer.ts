// Ascolta il microfono con il riconoscimento vocale del browser (Web Speech API).
// Se il browser lo ferma da solo (pausa lunga), lo riavvia finché l'utente non preme Stop.

export type RecognizerState = "idle" | "starting" | "listening";
export type RecognizerError = "not-allowed" | "no-mic" | "no-speech" | "network" | "model" | "other";

export interface Handlers {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onState: (s: RecognizerState) => void;
  onError: (e: RecognizerError) => void;
  /** Solo per il riconoscimento offline: avanzamento del download del modello, da 0 a 100. */
  onProgress?: (pct: number) => void;
}

// Tipi minimi: TypeScript non li include ancora tutti.
interface SRResult { isFinal: boolean; 0: { transcript: string } }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SR {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void;
}
type SRCtor = new () => SR;

function getCtor(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isSpeechSupported = () => getCtor() !== null;

export function createRecognizer(lang: string, h: Handlers) {
  const Ctor = getCtor();
  if (!Ctor) throw new Error("Riconoscimento vocale non supportato");

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;

  let wanted = false; // l'utente vuole ascoltare?
  let fatal = false;  // errore che impedisce di continuare

  rec.onstart = () => h.onState("listening");

  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) h.onFinal(r[0].transcript);
      else interim += r[0].transcript;
    }
    h.onInterim(interim);
  };

  rec.onerror = (e) => {
    h.onInterim("");
    switch (e.error) {
      case "not-allowed":
      case "service-not-allowed":
        fatal = true; h.onError("not-allowed"); break;
      case "audio-capture":
        fatal = true; h.onError("no-mic"); break;
      case "no-speech":
        h.onError("no-speech"); break; // non fatale: si riavvia
      case "network":
        fatal = true; h.onError("network"); break;
      case "aborted":
        break;
      default:
        h.onError("other");
    }
  };

  rec.onend = () => {
    h.onInterim("");
    if (wanted && !fatal) {
      try { rec.start(); return; } catch { /* già avviato */ }
    }
    wanted = false;
    h.onState("idle");
  };

  return {
    start() {
      wanted = true; fatal = false;
      h.onState("starting");
      try { rec.start(); } catch { /* già in ascolto */ }
    },
    stop() {
      wanted = false;
      rec.stop();
    },
  };
}
