// Operazioni sull'elenco dei documenti. Ogni funzione lancia un errore se qualcosa va storto: chi la usa lo mostra, nessun errore viene nascosto.
import { MAX_BACKUP_DOCUMENTS } from "./backup";
import { db, type DocumentRow } from "./db";
import { byModified, byRecency, copyTitle } from "../documents/order";
import { isExpired } from "../documents/trash";

/** Quanti documenti si possono avere: quanti ne entrano in una copia di sicurezza. */
export const MAX_DOCUMENTS = MAX_BACKUP_DOCUMENTS;

/** I documenti non nel cestino, dal modificato più di recente. */
export async function listDocuments(): Promise<DocumentRow[]> {
  return byModified((await db.documents.toArray()).filter((d) => !d.deletedAt));
}

/** I documenti nel cestino, dall'ultimo eliminato. */
export async function listTrash(): Promise<DocumentRow[]> {
  const rows = await db.documents.where("deletedAt").above(0).toArray();
  return rows.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

/** Quello da riaprire all'avvio: l'ultimo modificato o aperto, tra quelli non nel cestino. */
export async function loadCurrentDocument(): Promise<DocumentRow | undefined> {
  return byRecency((await db.documents.toArray()).filter((d) => !d.deletedAt))[0];
}

export const countDocuments = async () => (await db.documents.toArray()).filter((d) => !d.deletedAt).length;

export async function markOpened(id: string, now = Date.now()): Promise<void> {
  await db.documents.update(id, { openedAt: now });
}

/** Cambia il nome. Da qui in poi non lo cambia più il salvataggio automatico. */
export async function renameDocument(id: string, title: string): Promise<void> {
  const clean = title.trim();
  if (!clean) throw new Error("nome vuoto");
  await db.documents.update(id, { title: clean, titleCustom: true });
}

/** Una copia con un id nuovo. Lo spazio nel limite dei documenti va controllato prima. */
export async function duplicateDocument(id: string, suffix: string, now = Date.now()): Promise<DocumentRow> {
  const [original, all] = await Promise.all([db.documents.get(id), db.documents.toArray()]);
  if (!original) throw new Error("documento non trovato");
  const copy: DocumentRow = {
    id: crypto.randomUUID(),
    title: copyTitle(original.title, suffix, all.map((d) => d.title)),
    titleCustom: true,
    content: original.content,
    language: original.language,
    createdAt: now,
    updatedAt: now,
    openedAt: now,
  };
  await db.documents.add(copy);
  return copy;
}

export async function trashDocument(id: string, now = Date.now()): Promise<void> {
  await db.documents.update(id, { deletedAt: now });
}

export async function restoreDocument(id: string): Promise<void> {
  await db.documents.where("id").equals(id).modify((d) => {
    delete d.deletedAt;
  });
}

/** Cancellazione definitiva: solo da qui e dallo svuotamento automatico. */
export async function deleteForever(id: string): Promise<void> {
  await db.documents.delete(id);
}

/** Toglie dal cestino ciò che c'è da più di 30 giorni. Restituisce quanti. */
export async function purgeExpired(now = Date.now()): Promise<number> {
  const old = (await listTrash()).filter((d) => isExpired(d.deletedAt ?? now, now)).map((d) => d.id);
  if (old.length) await db.documents.bulkDelete(old);
  return old.length;
}
