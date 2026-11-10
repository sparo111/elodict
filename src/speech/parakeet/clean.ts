// Pulizia del testo di Parakeet prima di consegnarlo all'editor. Non cambia nessuna parola e nessuna cifra:
// toglie solo i testi senza lettere né numeri (silenzio) e, se la frase finisce senza punteggiatura, aggiunge il punto.

/** Dopo queste lettere/cifre non c'è punteggiatura: si aggiunge il punto. Se la frase finisce già con . , ; : ! ? … « » " ) non si tocca. */
const ENDS_WITH_WORD = /[\p{L}\p{N}]$/u;

export function cleanParakeetText(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return ""; // niente da scrivere (silenzio o solo segni)
  return ENDS_WITH_WORD.test(t) ? `${t}.` : t;
}
