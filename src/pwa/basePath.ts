// Percorsi del sito quando non sta nella radice (per esempio su GitHub Pages: /elodict/).
// Funzioni pure: usate sia dalla configurazione di Vite sia dal lavoratore di Whisper.

/** "elodict" → "/elodict/"; "" o undefined → "/"; un indirizzo completo resta tale, con la barra finale. */
export function normalizeBase(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  // Git Bash su Windows cambia "/elodict/" in "C:/Program Files/Git/elodict/" prima di passarlo ai programmi: il sito verrebbe rotto.
  if (/^[A-Za-z]:[\\/]/.test(value)) {
    throw new Error(`VITE_BASE non valido ("${value}"): sembra un percorso di Windows. In Git Bash scrivi: MSYS_NO_PATHCONV=1 VITE_BASE=/elodict/ npm run build`);
  }
  if (/^https?:\/\//i.test(value)) return value.endsWith("/") ? value : `${value}/`;
  let b = value || "/";
  if (!b.startsWith("/")) b = `/${b}`;
  if (!b.endsWith("/")) b += "/";
  return b.replace(/\/{2,}/g, "/");
}

/**
 * Indirizzo COMPLETO (sito incluso) della cartella con i file del motore di Whisper («ort»: onnxruntime-web 1.22) o di Parakeet («ort31»:
 * onnxruntime-web 1.31, che la libreria di Parakeet richiede: sono due copie separate, vedi AUDIT_T013d.md).
 * Deve essere completo: se fosse relativo, in sviluppo Vite rifiuterebbe di servirli come moduli.
 */
export function ortBaseUrl(base: string, origin: string, folder: "ort" | "ort31" = "ort"): string {
  const b = normalizeBase(base);
  return /^https?:\/\//i.test(b) ? `${b}${folder}/` : new URL(`${b}${folder}/`, origin).href;
}
