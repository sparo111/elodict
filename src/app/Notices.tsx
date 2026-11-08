import { AlertTriangle } from "lucide-react";
import type { Strings } from "../i18n";
import type { EngineKind } from "../speech/engine";
import type { RecognizerError } from "../speech/recognizer";

interface Props {
  s: Strings;
  supported: boolean;
  engine: EngineKind;
  error: RecognizerError | null;
  /** ascolta ma da un po' non arriva testo */
  noText: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
}

/** Avvisi sopra il foglio: motore non disponibile, errore del microfono, nessun testo in arrivo. */
export function Notices({ s, supported, engine, error, noText, onRetry, onOpenSettings }: Props) {
  return (
    <div className="mx-auto w-full max-w-editor px-4">
      {!supported && (
        <div role="alert" className="mt-4 flex gap-3 rounded-md bg-warning-soft p-4 text-warning">
          <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{s.unsupportedTitle}</p>
            <p className="text-sm">{engine === "offline" ? s.unsupportedOfflineBody : s.unsupportedBody}</p>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-md border border-danger p-4 text-danger">
          <p className="text-sm">{s.errors[error]}</p>
          {error !== "no-speech" ? (
            <button type="button" onClick={onRetry} className="shrink-0 text-sm font-semibold underline">
              {s.retry}
            </button>
          ) : (
            <button type="button" onClick={onOpenSettings} className="shrink-0 text-sm font-semibold underline">
              {s.noTextAction}
            </button>
          )}
        </div>
      )}

      {noText && !error && (
        <div role="status" className="mt-4 flex items-start justify-between gap-3 rounded-md bg-accent-soft p-4 text-text">
          <p className="text-sm">{s.noText}</p>
          <button type="button" onClick={onOpenSettings} className="shrink-0 text-sm font-semibold text-accent underline">
            {s.noTextAction}
          </button>
        </div>
      )}
    </div>
  );
}
