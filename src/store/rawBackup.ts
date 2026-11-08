// Copia di emergenza: legge il database «così com'è», senza passare dall'aggiornamento di Dexie.
// Serve quando l'app non riesce ad aprire i documenti salvati (per esempio una migrazione non riuscita):
// in quel caso i dati sono ancora lì, nella versione di prima, e qui si leggono senza cambiarli.
import { buildBackup } from "./backup";
import type { DocumentRow, SettingsRow } from "./db";

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(store)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/** Tutti i documenti (anche quelli nel cestino) e le impostazioni, nel formato della copia di sicurezza. Non si fermano ai limiti: è una copia di salvataggio. */
export async function rawBackupJson(): Promise<string> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("elodict"); // senza versione: si apre quella che c'è, senza aggiornarla
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(new Error("bloccato"));
  });
  try {
    const [documents, settings] = await Promise.all([readAll<DocumentRow>(db, "documents"), readAll<SettingsRow>(db, "settings")]);
    return JSON.stringify(buildBackup(settings[0], documents), null, 2);
  } finally {
    db.close();
  }
}
