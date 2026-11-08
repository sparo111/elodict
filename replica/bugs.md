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
