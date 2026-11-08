// Cambi di schema del database. Una migrazione non cancella mai niente: o riesce, o il database resta com'era.
import type { Transaction } from "dexie";
import type { DocumentRow } from "./db";

/**
 * Punto di innesco per le prove: se la pagina imposta questa variabile prima di aprire il database,
 * la migrazione fallisce di proposito. Serve a provare cosa vede l'utente quando una migrazione non riesce.
 * Nessuna parte dell'app la imposta.
 */
export const FAIL_MIGRATION_FLAG = "__ELODICT_FAIL_MIGRATION__";

/**
 * Versione 1 → 2 (elenco dei documenti): ai documenti già salvati si aggiunge l'ultima apertura,
 * uguale all'ultima modifica, così l'ordine non cambia. Nient'altro viene toccato.
 */
export async function migrateToV2(tx: Transaction): Promise<void> {
  if ((globalThis as Record<string, unknown>)[FAIL_MIGRATION_FLAG]) throw new Error("migrazione interrotta apposta per una prova");
  await tx
    .table<DocumentRow>("documents")
    .toCollection()
    .modify((d) => {
      if (d.openedAt === undefined) d.openedAt = d.updatedAt;
    });
}
