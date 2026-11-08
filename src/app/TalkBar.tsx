import { Mic, Square } from "lucide-react";
import type { Strings } from "../i18n";
import type { RecognizerState } from "../speech/recognizer";

interface Props {
  s: Strings;
  state: RecognizerState;
  paused: boolean;
  loadPct: number | null;
  supported: boolean;
  onToggle: () => void;
  onResume: () => void;
}

/** Barra in basso: cosa sta succedendo e il tasto grande «Parla / Ferma». */
export function TalkBar({ s, state, paused, loadPct, supported, onToggle, onResume }: Props) {
  const active = state !== "idle";
  const status = paused
    ? s.paused
    : state === "listening"
      ? s.listening
      : state === "starting"
        ? loadPct !== null
          ? s.loadingModel.replace("{pct}", String(loadPct))
          : s.starting
        : " ";
  return (
    <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 border-t border-border bg-bg px-4 py-3">
      <p className="text-sm text-muted" role="status" aria-live="polite">
        {status}
        {paused && (
          <button type="button" onClick={onResume} className="ml-3 font-semibold text-accent underline">
            {s.resume}
          </button>
        )}
      </p>
      <button
        type="button"
        onClick={onToggle}
        disabled={!supported}
        aria-pressed={active}
        className={`inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50 ${
          active ? "bg-recording" : "bg-accent"
        }`}
      >
        {active ? (
          <>
            <Square size={18} aria-hidden="true" />
            {s.stop}
            <span className="pulse-dot h-2 w-2 rounded-pill bg-on-accent" aria-hidden="true" />
          </>
        ) : (
          <>
            <Mic size={20} aria-hidden="true" />
            {s.talk}
          </>
        )}
      </button>
    </div>
  );
}
