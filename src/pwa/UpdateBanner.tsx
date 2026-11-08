import { RefreshCw } from "lucide-react";
import type { Strings } from "../i18n";

interface Props {
  s: Strings;
  ready: boolean;
  busy: boolean;
  saveFailed: boolean;
  onApply: () => void;
  onLater: () => void;
}

export function UpdateBanner({ s, ready, busy, saveFailed, onApply, onLater }: Props) {
  if (!ready) return null;
  return (
    <section aria-label={s.updateReady} className="border-b border-border bg-accent-soft px-4 py-3">
      <div className="mx-auto flex max-w-editor flex-wrap items-center gap-3">
        <RefreshCw size={22} aria-hidden="true" className="shrink-0 text-accent" />
        <p role="status" className="min-w-40 flex-1 text-lg font-semibold">{s.updateReady}</p>
        <button
          type="button"
          onClick={onApply}
          disabled={busy}
          className="inline-flex min-h-12 items-center rounded-md bg-accent px-6 text-lg font-semibold text-on-accent disabled:opacity-60"
        >
          {busy ? s.updating : s.updateAction}
        </button>
        <button type="button" onClick={onLater} disabled={busy} className="inline-flex min-h-12 items-center rounded-md px-4 text-base font-semibold text-accent underline disabled:opacity-60">
          {s.updateLater}
        </button>
      </div>
      {saveFailed && (
        <p role="alert" className="mx-auto mt-2 max-w-editor text-base text-danger">{s.updateSaveFailed}</p>
      )}
    </section>
  );
}
