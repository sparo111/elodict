// Stima di quanto manca alla fine di un download, dalla percentuale fatta e dal tempo trascorso.

/** Secondi che mancano, oppure null se è troppo presto per dirlo (si rischierebbe un numero sbagliato). */
export function estimateRemainingSeconds(elapsedMs: number, pct: number): number | null {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(pct)) return null;
  if (pct < 3 || pct >= 100 || elapsedMs < 1500) return null;
  return Math.max(1, Math.round(((elapsedMs / pct) * (100 - pct)) / 1000));
}

export interface EtaTexts {
  etaSeconds: string; // «{n} secondi»
  etaMinute: string;  // «1 minuto»
  etaMinutes: string; // «{n} minuti»
  etaAlmost: string;  // «pochi secondi»
}

/** «pochi secondi», «30 secondi», «1 minuto», «3 minuti»: arrotondato, per non dare una falsa precisione. */
export function formatEta(seconds: number, t: EtaTexts): string {
  if (seconds < 10) return t.etaAlmost;
  const rounded = Math.round(seconds / 5) * 5;
  if (rounded < 60) return t.etaSeconds.replace("{n}", String(rounded));
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? t.etaMinute : t.etaMinutes.replace("{n}", String(minutes));
}
