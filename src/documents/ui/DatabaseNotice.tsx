import { Copy, RefreshCw } from "lucide-react";
import type { Strings } from "../../i18n";

/**
 * Elodict è aperto anche in un'altra scheda e il database è uno solo.
 * - `blocked`: questa scheda aspetta che l'altra si chiuda; continua da sola.
 * - `stale`: l'altra scheda ha aggiornato il database; questa ha già salvato e chiuso, e va ricaricata.
 */
export function DatabaseNotice({ s, kind }: { s: Strings; kind: "blocked" | "stale" }) {
  const blocked = kind === "blocked";
  return (
    <section role="alert" aria-label={blocked ? s.dbBlockedTitle : s.dbStaleTitle} className="border-b border-border bg-warning-soft px-4 py-4 text-text">
      <div className="mx-auto flex max-w-editor flex-wrap items-start gap-4">
        <Copy size={28} aria-hidden="true" className="mt-1 shrink-0 text-accent" />
        <div className="min-w-48 flex-1">
          <p className="text-lg font-bold">{blocked ? s.dbBlockedTitle : s.dbStaleTitle}</p>
          <p className="text-base">{blocked ? s.dbBlockedBody : s.dbStaleBody}</p>
        </div>
        {!blocked && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-6 text-lg font-semibold text-on-accent"
          >
            <RefreshCw size={20} aria-hidden="true" />
            {s.dbStaleAction}
          </button>
        )}
      </div>
    </section>
  );
}
