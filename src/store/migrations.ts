// Cambi di schema del database. Una migrazione non cancella mai niente: o riesce, o il database resta com'era.
import type { Transaction } from "dexie";
import type { DocumentRow } from "./db";

/**
 * Punto di innesco per le prove: se la pagina imposta questa variabile prima di aprire il database,
 * la migrazione fallisce di proposito. Serve a provare cosa vede l'utente quando una migrazione non riesce.
 * Nessuna parte dell'app la imposta. Esiste SOLO nel server di sviluppo e nelle build di prova: nella build pubblicata
 * `__ELODICT_TEST_HOOKS__` vale falso e questo codice (e il nome della variabile) non c'è proprio (lo controlla `npm run check:dist`).
 */
function simulatedFailure(): boolean {
  return __ELODICT_TEST_HOOKS__ && Boolean((globalThis as Record<string, unknown>)["__ELODICT_FAIL_MIGRATION__"]);
}

/**
 * Versione 1 → 2 (elenco dei documenti): ai documenti già salvati si aggiunge l'ultima apertura,
 * uguale all'ultima modifica, così l'ordine non cambia. Nient'altro viene toccato.
 */
export async function migrateToV2(tx: Transaction): Promise<void> {
  if (simulatedFailure()) throw new Error("migrazione interrotta apposta per una prova");
  await tx
    .table<DocumentRow>("documents")
    .toCollection()
    .modify((d) => {
      if (d.openedAt === undefined) d.openedAt = d.updatedAt;
    });
}
