import { useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { downloadFile } from "../../export/build";
import type { Strings } from "../../i18n";
import { rawBackupJson } from "../../store/rawBackup";

/**
 * Se il database non si apre (per esempio un aggiornamento non riuscito) l'app non cancella niente:
 * lo dice, spiega che adesso non salva, e offre di scaricare una copia di quello che c'è, letto così com'è.
 */
export function DatabaseProblem({ s }: { s: Strings }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  const download = async () => {
    try {
      const json = await rawBackupJson();
      const day = new Date().toISOString().slice(0, 10);
      downloadFile(new File([json], `elodict-copia-${day}.json`, { type: "application/json" }));
      setState("done");
    } catch (e) {
      console.warn("copia di emergenza non riuscita", e);
      setState("failed");
    }
  };

  return (
    <section role="alert" aria-label={s.dbProblemTitle} className="border-b border-danger bg-warning-soft px-4 py-4 text-text">
      <div className="mx-auto flex max-w-editor flex-wrap items-start gap-4">
        <AlertTriangle size={28} aria-hidden="true" className="mt-1 shrink-0 text-danger" />
        <div className="min-w-48 flex-1">
          <p className="text-lg font-bold">{s.dbProblemTitle}</p>
          <p className="text-base">{s.dbProblemBody}</p>
          {state === "done" && <p role="status" className="mt-2 text-base font-semibold text-success">{s.dbProblemDone}</p>}
          {state === "failed" && <p className="mt-2 text-base font-semibold text-danger">{s.dbProblemFailed}</p>}
        </div>
        <button
          type="button"
          onClick={() => void download()}
          className="inline-flex min-h-12 items-center gap-2 rounded-md bg-accent px-6 text-lg font-semibold text-on-accent"
        >
          <Download size={20} aria-hidden="true" />
          {s.dbProblemAction}
        </button>
      </div>
    </section>
  );
}
