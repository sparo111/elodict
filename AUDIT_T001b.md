# AUDIT_T001b — Spiegare cos'è Elodict

Data: 8 novembre 2026. T002 non era in corso: non c'è nulla da riprendere.

**FUNZIONALE — PASS ✅**
- Riquadro «Cos'è Elodict» in cima a `installa.html`, sotto il nome e prima dei passi, nelle 4 lingue; frase n. 1 sotto il titolo della schermata della lingua nel primo avvio.
- Prove sulla logica: 146 riuscite (invariate). Prove nel browser: 372 in totale, di cui 365 riuscite e 7 saltate di proposito, **se si contano le 2 che sono cadute nella corsa completa** (vedi sotto).
- **Instabilità vecchia, non nuova**: nella corsa completa sono cadute 2 prove di selezione a voce (`f07`, SEL-H2 e SEL-H3, solo computer). Rilanciate da sole 3 volte: 51 su 51 riuscite. Sembrano dipendere dal carico del computer quando girano tante prove insieme; non ho indagato la causa.
- Nessuna dipendenza nuova.

**SICUREZZA — PASS ✅**
- Solo testo statico. Il file generato `public/installa-testi.js` contiene soltanto le frasi (nessun dato, nessun segreto) ed è ignorato da git. Nessun nuovo accesso a internet.

**QUALITÀ — PASS ✅**
- Una sola sorgente dei testi: `src/i18n.ts` (chiavi `whatTitle`, `what1`–`what7`, uguali nelle 4 lingue). Come: un piccolo plugin in `vite.config.ts` scrive `public/installa-testi.js` ad ogni avvio/costruzione e `installa.html` lo carica. Non si modifica a mano.
- **Testi**: usati così come sono, nessuna correzione di grammatica o battitura.
- **Controllo di coerenza**: frase 3 verificata in `src/commands/*.ts`: «virgola/punto/a capo», «comma/period/new line», «virgule/point/à la ligne», «coma/punto/nueva línea» sono comandi reali. Frase 6: le etichette del primo avvio sono davvero «Privato / Private / Privé / Privado». Nessuna parola da cambiare.
- **Stampa su un foglio**: con i testi nuovi il **francese andava su 2 pagine**. Ho prima ridotto margini e spazi (come richiesto), poi la dimensione dei passi di installazione (da 17 a 14 pt). Il riquadro non è stato ridotto (14,5 pt). Ora 1 pagina A4 per ogni lingua. Il corpo del testo e i titoli sono un po' più piccoli di prima.
- Nessun `catch` vuoto, nessun codice morto aggiunto.

**INTEGRAZIONE — PASS ✅**
- Prove nuove (computer e telefono 390 px): riquadro visibile con ruolo `heading` in 4 lingue, cambia con le bandierine, 7 voci, axe senza errori; frase 1 nel primo avvio; stampa 1 pagina per lingua.
- Il primo avvio, le impostazioni e `hydratedFor` non sono stati toccati.

## GATE COMPLESSIVO: PASS ✅
Non verificato: la stampa su carta vera (solo il numero di pagine); il francese riempie quasi tutto il foglio.

## IN ATTESA DI ISTRUZIONE
