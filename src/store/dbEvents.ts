// Cosa succede al database quando c'è un'altra scheda di Elodict aperta (un altro dei suoi «clienti»).
// Il database è uno solo per tutte le schede: chi vuole aggiornarlo deve aspettare che le altre lo lascino.

/**
 * - `blocked`: questa scheda vuole aggiornare il database ma un'altra scheda lo tiene aperto
 * - `unblocked`: l'altra scheda l'ha lasciato, l'aggiornamento è andato avanti
 * - `stale`: un'altra scheda vuole aggiornare (o cancellare) il database: questa l'ha salvato e chiuso e va ricaricata
 */
export type DbEvent = "blocked" | "unblocked" | "stale";

const listeners = new Set<(e: DbEvent) => void>();
let beforeClose: (() => Promise<unknown>) | null = null;

export function subscribeDbEvents(fn: (e: DbEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitDbEvent(e: DbEvent): void {
  for (const fn of [...listeners]) fn(e);
}

/** Cosa fare prima di chiudere il database a un'altra scheda (di solito: salvare il documento aperto). */
export function setBeforeDbClose(fn: (() => Promise<unknown>) | null): void {
  beforeClose = fn;
}

export async function runBeforeDbClose(): Promise<void> {
  try {
    await beforeClose?.();
  } catch (e) {
    console.warn("non sono riuscito a salvare prima di chiudere il database", e);
  }
}
