# AUDIT_T001f — Installazione su iPhone più immediata

Data: 9 novembre 2026.

Problema (provato su un iPhone vero): nella finestra «Aggiungi Elodict alla schermata Home» l'utente toccava i riquadri 1-2-3 pensando fossero pulsanti, e non succedeva niente.

La finestra è nell'app (`src/install/Install.tsx`, caso «iPhone con Safari»), non in `installa.html`: le modifiche sono lì. `installa.html` non è cambiata.

## Cosa è cambiato
- **Pulsante «Apri il menu Condividi»** (4 lingue), grande, sopra «Stampa le istruzioni». Chiama `navigator.share({ title: "Elodict", url: <indirizzo dell'app> })`; l'indirizzo viene da `BASE_URL`, quindi vale anche sotto `/elodict/`. Si mostra solo se `navigator.share` esiste. Se l'utente annulla (`AbortError`) non succede nulla di visibile; ogni altro errore va solo in console (avviso).
- **Riga sotto il pulsante** (4 lingue): «Nel menu, scorri e tocca "Aggiungi alla schermata Home". Se non c'è, chiudi il menu e usa il pulsante Condividi di Safari, in fondo allo schermo.» Compare solo insieme al pulsante.
- **Freccia grande e animata** («Tocca qui sotto», 4 lingue) fissa in fondo al centro dello schermo, verso il pulsante Condividi di Safari. Rimbalza; con `prefers-reduced-motion` sta ferma (`animation: none`). È decorativa (`aria-hidden`).
- **Passi 1-2-3 da istruzione**: niente bordo, ombra, sfondo né angoli arrotondati; il numero è testo semplice («1.»), non più un cerchio pieno. Titolo **«Come fare»** sopra l'elenco (anche negli altri casi con passi: «iPhone con altro programma» e «menu» del computer, perché usano lo stesso componente).
- Pulsante e freccia solo nel caso Safari su iPhone: nel caso Chrome/Firefox su iPhone («Apri Elodict con Safari») resta «Copia l'indirizzo».
- Prove: `e2e/pwa-iphone-condividi.spec.ts` (progetto `pwa-iphone`, WebKit + iPhone 15, a 390 px).

## Le 4 righe

**FUNZIONALE — PASS ✅** — 14 prove nuove, tutte riuscite, in it/en/fr/es: «Come fare» sopra i passi; i 3 passi senza bordo, ombra, sfondo, angoli e cursore da pulsante e senza controlli dentro; pulsante alto ≥56 px e largo >250 px, con sotto la riga e sopra «Stampa le istruzioni»; `navigator.share` (simulato) chiamato una sola volta con `{ title: "Elodict", url: "http://localhost:5200/" }`; annullamento (`AbortError`) senza avvisi, errori né allarmi e con la finestra ancora aperta; senza `navigator.share` pulsante e riga assenti ma passi e «Stampa» presenti; freccia presente, centrata, in fondo, con scritta, animata; con movimento ridotto ferma.

**SICUREZZA — PASS ✅** — Nessuna dipendenza nuova (solo due icone già in `lucide-react`); `navigator.share` riceve solo titolo e indirizzo pubblico dell'app, nessun dato dell'utente.

**QUALITÀ — PASS ✅ (con una nota)** — `tsc` pulito; 194 prove sulla logica; axe senza violazioni (finestra e freccia) in 4 lingue a 390 px, senza scorrimento orizzontale. Suite nel browser (desktop, mobile, pwa-desktop, pwa-mobile, pwa-iphone): 491 riuscite, 12 saltate di proposito, 0 cadute (la prova di Whisper vero, caduta per tempo nel giro di T001e, qui è riuscita). Guardando uno screenshot a 390 px ho corretto due cose: la freccia usciva dal bordo a metà rimbalzo (aggiunto margine) e il testo del pulsante andava su due righe (carattere ridotto). Nota: il profilo iPhone 15 è largo 393 px, non 390: la larghezza 390 è impostata a mano nella prova.

**INTEGRAZIONE — PASS ✅** — Le prove esistenti della finestra (`pwa-installabile`: 3 passi, axe) restano invariate e riuscite; il nuovo titolo «Come fare» è comune a tutti i casi con passi.

## Cosa NON ho potuto verificare
- **Il menu Condividi vero di Safari**: `navigator.share` è simulato (WebKit di Playwright non apre il foglio di condivisione). Non so se, su iOS, la voce «Aggiungi alla schermata Home» compaia nel menu aperto da `navigator.share` (per questo la riga di aiuto rimanda al pulsante Condividi di Safari). Da provare sul telefono dopo la pubblicazione.
- **Posizione della freccia rispetto alla barra di Safari**: è centrata in fondo alla pagina; la barra vera (e la sua altezza, anche con Safari in cima) non è simulata.
- Il sito pubblicato dopo il push: controllato nella risposta finale.

## GATE COMPLESSIVO: PASS ✅
