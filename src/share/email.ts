/** Oltre questa lunghezza molti programmi di posta tagliano il testo di un link mailto. */
export const MAILTO_LIMIT = 1800;

export function mailtoUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function fitsInMailto(subject: string, body: string): boolean {
  return mailtoUrl(subject, body).length <= MAILTO_LIMIT;
}

/** Il menu "Condividi" del sistema può allegare file? (di solito sì sul telefono, meno sul computer) */
export function canShareFiles(): boolean {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
    return navigator.canShare({ files: [new File(["x"], "a.txt", { type: "text/plain" })] });
  } catch {
    return false;
  }
}
