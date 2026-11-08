// Percorsi del sito quando non sta nella radice (per esempio su GitHub Pages: /elodict/).
// Funzioni pure: usate sia dalla configurazione di Vite sia dal lavoratore di Whisper.

/** "elodict" → "/elodict/"; "" o undefined → "/"; un indirizzo completo resta tale, con la barra finale. */
export function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (/^https?:\/\//i.test(value)) return value.endsWith("/") ? value : `${value}/`;
  let b = value || "/";
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b += "/";
  return b.replace(/\/{2,}/g, "/");
}

/**
 * Indirizzo COMPLETO (sito incluso) della cartella con i file del motore di Whisper.
 * Deve essere completo: se fosse relativo, in sviluppo Vite rifiuterebbe di servirli come moduli.
 */
export function ortBaseUrl(base: string, origin: string): string {
  const b = normalizeBase(base);
  return /^https?:\/\//i.test(b) ? `${b}ort/` : new URL(`${b}ort/`, origin).href;
}
