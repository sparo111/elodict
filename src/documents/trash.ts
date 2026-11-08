// Il cestino: i documenti tolti restano 30 giorni, poi si cancellano da soli.

export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** Quando un documento messo nel cestino a `deletedAt` viene cancellato davvero. */
export const expiresAt = (deletedAt: number) => deletedAt + TRASH_DAYS * DAY;

export const isExpired = (deletedAt: number, now: number) => now >= expiresAt(deletedAt);

/** Giorni che restano (arrotondati in su: l'ultimo giorno è «ancora 1 giorno»; mai meno di 0). */
export const daysLeft = (deletedAt: number, now: number) => Math.max(0, Math.ceil((expiresAt(deletedAt) - now) / DAY));
