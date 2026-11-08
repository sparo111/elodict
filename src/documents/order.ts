// Quale documento riaprire all'avvio e in che ordine mostrarli.

interface Dated {
  updatedAt: number;
  openedAt?: number;
}

/** Quanto è «recente» un documento: l'ultima volta che è stato modificato o aperto (la più vicina). */
export const recencyKey = (d: Dated) => Math.max(d.openedAt ?? 0, d.updatedAt);

/** Dal più recente al meno recente, senza cambiare l'elenco originale. */
export function byRecency<T extends Dated>(docs: T[]): T[] {
  return [...docs].sort((a, b) => recencyKey(b) - recencyKey(a));
}

/** Per l'elenco: dal modificato più di recente. */
export function byModified<T extends Dated>(docs: T[]): T[] {
  return [...docs].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Titolo di una copia: «Lettera (copia)». Se c'è già una copia, si aggiunge un numero. */
export function copyTitle(title: string, suffix: string, existing: string[]): string {
  const base = `${title} ${suffix}`;
  if (!existing.includes(base)) return base;
  for (let n = 2; ; n++) {
    const t = `${title} ${suffix} ${n}`;
    if (!existing.includes(t)) return t;
  }
}
