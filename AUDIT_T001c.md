# AUDIT_T001c — Dedica

Data: 8 novembre 2026.

**FUNZIONALE — PASS ✅**
- Dedica nei 4 posti richiesti: `installa.html` (subito sotto il nome, prima di «Cos'è Elodict», centrata, in corsivo), prima schermata del primo avvio (sotto la frase n. 1), in fondo a Impostazioni, in cima a `README.md` (italiano). Cambia lingua con le bandierine.
- Prove sulla logica: 146 riuscite. Prove nel browser: **378, di cui 371 riuscite e 7 saltate di proposito, 0 cadute** (nella corsa precedente erano cadute 2 prove instabili, questa volta no).
- Nessuna dipendenza nuova.

**SICUREZZA — PASS ✅**
- Solo testo statico, nessun segreto né accesso nuovo a internet. Il file generato `public/installa-testi.js` resta ignorato da git.

**QUALITÀ — PASS ✅**
- Testi esattamente come ricevuti; una sola sorgente (`src/i18n.ts`, chiave `dedication` uguale nelle 4 lingue), passata alla pagina statica dal plugin già usato in T001b.
- Nessun colore nuovo (`contrast.py` non necessario).
- **Stampa**: con la dedica italiano e francese andavano a 2 pagine. Ho ridotto margini e spazi, poi titoli e passi di installazione (da 14 a 13 pt). Dedica e riquadro «Cos'è Elodict» non sono stati toccati. Ora 1 pagina A4 per lingua.
- **Nota sul carattere**: nella pagina statica la dedica chiede «Source Serif 4», ma la pagina non lo carica (il file del carattere ha un nome generato): se non è installato sul computer si vede Georgia. Lo stesso nell'app e nel primo avvio usano il vero Source Serif 4 dei token.
- Nessun `catch` vuoto, nessun codice morto.

**INTEGRAZIONE — PASS ✅**
- Prove nuove (computer e 390 px): dedica prima del riquadro in `installa.html` in 4 lingue (posizione verificata), nella prima schermata del primo avvio nelle 4 lingue con axe senza errori, in Impostazioni nelle 4 lingue, assente da Markdown, testo semplice e pagina web esportati. Stampa: 1 pagina per lingua.
- **Non verificato**: `.docx` e `.pdf` esportati non sono stati aperti per cercare la dedica (sono compressi/binari). Il testo non viene mai passato all'esportazione, che parte solo dal contenuto del foglio. Stampa su carta vera.

## GATE COMPLESSIVO: PASS ✅

## IN ATTESA DI ISTRUZIONE
