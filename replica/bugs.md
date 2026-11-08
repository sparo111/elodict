# Difetti trovati

## BUG-001 — S1 — "nuovo paragrafo" fa sparire tutta la frase detta  (CORRETTO)
- **Passi:** dire (o scrivere nella casella di prova) "uno nuovo paragrafo tre".
- **Atteso:** due paragrafi, "Uno" e "Tre".
- **Ottenuto:** il documento resta vuoto. Il testo detto viene perso senza nessun messaggio.
- **Causa:** i comandi della frase venivano eseguiti in un blocco solo; se uno non poteva essere eseguito, il browser annullava l'intero blocco.
- **Prova:** `e2e/f02-comandi.spec.ts` F02-H4 (falliva su desktop e telefono).
- **Correzione:** ora ogni pezzo (testo, a capo, paragrafo) è eseguito da solo. File `src/App.tsx`. Commit: vedi git log "fix: ..." di questa sessione.

## BUG-002 — S3 — "annulla" cancellava più frasi insieme  (CORRETTO)
- **Passi:** "ciao bel mondo", poi subito "cancella parola", poi "annulla".
- **Atteso:** "Ciao bel mondo". **Ottenuto:** documento vuoto.
- **Causa:** le modifiche ravvicinate (meno di mezzo secondo) finivano nello stesso passo di "annulla".
- **Prova:** F02-H2.
- **Correzione:** ogni frase detta chiude il passo precedente (`closeHistory`).

## BUG-003 — S3 — La barra degli strumenti non era in una sezione con nome  (CORRETTO)
- **Problema:** il controllo di accessibilità (axe, regola `region`) segnalava la barra fuori da una zona riconoscibile dai lettori di schermo.
- **Prova:** A11Y-1 e A11Y-2.
- **Correzione:** la barra è dentro una `<section>` con nome «Formattazione».

## Da controllare (non riprodotti, nessuna certezza)
- La parola "punto" detta come parola normale ("il punto di vista") diventa un punto: è il compromesso scelto, da rivedere con l'uso reale.
- Con due schede aperte insieme vince l'ultimo salvataggio.
- Il PDF non ha grassetto/corsivo (limite noto, non un errore).
- Spagnolo: comandi da un riassunto della pagina Microsoft, da far rivedere a un madrelingua.

## Riepilogo
S1: 1 (corretto) · S2: 0 · S3: 2 (corretti) · S4: 0 · aperti: 0

## BUG-004 — S4 — Il corsivo/grassetto di "questo" includeva lo spazio davanti alla frase  (CORRETTO)
- **Passi:** "prima frase punto", "seconda frase", "corsivo questo".
- **Atteso:** corsivo solo su «Seconda frase». **Ottenuto:** anche lo spazio prima.
- **Prova:** `e2e/f02-comandi.spec.ts` F02-H13. **Correzione:** gli spazi ai bordi sono esclusi dall'intervallo formattato (`src/App.tsx`).

## Aggiornamento riepilogo
S1: 1 · S2: 0 · S3: 2 · S4: 1 — tutti corretti, nessuno aperto.

## BUG-005 — S3 — Scegliere la lingua subito dopo l'apertura poteva essere annullato (e cancellare il dizionario)  (CORRETTO)
- **Passi:** aprire l'app e cambiare lingua prima che le impostazioni salvate siano state lette (pochi decimi di secondo, di più con il computer carico).
- **Atteso:** la lingua scelta vale. **Ottenuto:** tornava la lingua di prima; e se la scelta veniva salvata in quel momento, il dizionario personale salvato veniva sostituito da uno vuoto.
- **Come l'ho trovato:** una prova su telefono (CAPS-H4) falliva a volte, solo quando il computer era carico (c'erano in corso anche le prove con Whisper).
- **Causa:** (1) in sviluppo React avvia due volte il caricamento iniziale e il secondo, arrivando dopo la scelta, la sovrascriveva; (2) le scelte fatte prima del caricamento venivano salvate sopra i dati vecchi invece che accanto.
- **Prova:** `e2e/f09-gara-impostazioni.spec.ts` (ritarda di proposito l'apertura del database di 1,5 s): fallisce senza la correzione, passa con.
- **Correzione:** il caricamento iniziale parte una volta sola; le scelte fatte prima si ricordano e si applicano dopo, sopra le impostazioni lette.

## Riepilogo aggiornato
S1: 1 · S2: 0 · S3: 3 · S4: 1 — tutti corretti, nessuno aperto.

## BUG-006 — S4 — Due prove di selezione a voce cadevano quando il computer era carico  (CORRETTO, difetto della prova, non dell'app)
- **Passi:** corsa completa delle prove su computer (SEL-H2 e SEL-H3 in `e2e/f07`); da sole passavano.
- **Atteso:** la selezione letta è «tre» / tutto il testo. **Ottenuto:** testo vuoto.
- **Causa:** dopo un comando `seleziona…` TipTap dà il focus all'editor dentro un `requestAnimationFrame` (lo fa apposta, per iOS e Android). La selezione disegnata sullo schermo arriva quindi un frame dopo; la prova la leggeva subito. Lo stato interno dell'editor era già giusto (SEL-H1, che dipende da quello, non cadeva mai). Per chi usa l'app il ritardo è di circa 16 ms e non si nota: l'app non cambia.
- **Come l'ho riprodotto:** con `requestAnimationFrame` ritardato di 400 ms la vecchia prova falliva sempre (ricevuto `""`).
- **Prova:** SEL-R1 in `e2e/f07-selezione-elenchi-maiuscolo.spec.ts` (frame ritardati di 500 ms).
- **Correzione:** l'helper `selectedText()` in `e2e/helpers.ts` aspetta il segnale preciso che l'editor ha il focus, poi legge. Non ho allungato i tempi né ripetuto le prove. Ripetute 3 volte: 108 su 108.

## Riepilogo aggiornato (2)
S1: 1 · S2: 0 · S3: 3 · S4: 2 — tutti corretti, nessuno aperto.
