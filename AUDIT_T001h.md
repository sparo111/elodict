# AUDIT_T001h — Correzione di T001f (provata su iPhone vero)

Data: 9 novembre 2026.

Problemi trovati su un iPhone vero: (1) la freccia «Tocca qui sotto» copriva il pulsante «Apri il menu Condividi» in fondo alla finestra, e toccandola la finestra si chiudeva; (2) il pulsante non era subito visibile; (3) in alto, sul telefono, «Installa Elodict» mostrava solo un disegno.

## Cosa è cambiato
- **Freccia: spazio riservato (soluzione scelta).** La finestra «iPhone con Safari» lascia libero in fondo allo schermo uno spazio di 7,5 rem (`ARROW_SPACE`) e la freccia sta lì dentro. Quindi non si sovrappone mai alla finestra, qualunque sia l'altezza dello schermo o lo stato (prima e dopo il tocco sul pulsante, anche con `navigator.share` assente). Come: `Modal` ha una nuova proprietà `reserveBottom` (la finestra finisce `reserveBottom` sopra il fondo e la sua altezza massima diventa `100dvh − reserveBottom − 1rem`).
  - *Perché questa e non «mostrarla solo dopo il tocco»*: mostrarla dopo il tocco non basta, perché il foglio di condivisione si chiude e la freccia riapparirebbe comunque sopra la finestra; riservare lo spazio vale in ogni caso, senza stati da gestire.
  - **Tocco sulla freccia**: ora la freccia riceve il tocco e non fa nulla (prima era `pointer-events: none`, quindi il tocco cadeva sullo sfondo e chiudeva la finestra: era la causa del secondo difetto).
- **Pulsante primo elemento.** Ora la finestra è: titolo → «Apri il menu Condividi» → riga di aiuto → «Come fare» con i 3 passi → «Stampa le istruzioni». A 390x664 il pulsante sta tutto sullo schermo, senza scorrere. Con carattere un po' ridotto (`text-lg`) sta su una riga.
- **«Installa» sul telefono**: sotto 640 px il pulsante in alto mostra anche la scritta breve (`installBannerAction`: Installa / Install / Installer / Instalar); da 640 px in su resta «Installa Elodict». Il nome accessibile resta quello lungo, che contiene la scritta breve.
- File toccati: `src/components/Modal.tsx`, `src/install/Install.tsx`, `e2e/pwa-iphone-condividi.spec.ts` (nessun testo nuovo in `i18n.ts`).

## Le 4 righe

**FUNZIONALE — PASS ✅** — Prove WebKit + iPhone 15 a **390x664**, in it/en/fr/es: pulsante interamente nello schermo senza scorrere, non coperto (è l'elemento che si trova nel suo centro), primo controllo dopo la X di chiusura e sopra riga, «Come fare» e «Stampa»; confronto dei riquadri: la freccia (misurata 13 volte durante il rimbalzo) non interseca né la finestra né la parte visibile di nessun pulsante, e sta tutta nello schermo; un tocco sulla freccia lascia la finestra aperta; la scritta «Installa» (breve) è visibile a 390 px nelle 4 lingue, senza scorrimento orizzontale.

**SICUREZZA — PASS ✅** — Nessuna dipendenza nuova, nessun dato nuovo.

**QUALITÀ — PASS ✅ (con una nota)** — `tsc` pulito; 194 prove sulla logica; axe senza violazioni (finestra aperta, freccia, intestazione) in 4 lingue. Controllato anche uno screenshot a 390x664. Suite nel browser (desktop, mobile, pwa-desktop, pwa-mobile, pwa-iphone): **498 riuscite, 12 saltate di proposito, 1 caduta**: `WHISPER-IT-base` (Whisper vero), per tempo scaduto sotto carico; da solo riesce (38,9 s), come già in T001e. Un primo giro completo aveva dato altre cadute (nei progetti `pwa-iphone`/preview), non riprodotte: `pwa-iphone` da solo, 33 prove su 33, e un secondo giro completo senza quelle. Non ne ho trovato la causa; il sospetto è che i server di prova (porte 5200/5201) fossero ancora occupati dalla ricostruzione appena fatta.
- Nota di merito: dove la finestra ha poca altezza, i passi e «Stampa le istruzioni» si raggiungono scorrendo nell'area della finestra (a 390x664 si vedono il pulsante, la riga e i primi due passi).

**INTEGRAZIONE — PASS ✅** — `Modal` resta uguale per tutte le altre finestre (la proprietà è facoltativa e usata solo dal caso Safari su iPhone); le prove di T001e/T001f sono state adattate al nuovo ordine, non indebolite.

## Cosa NON ho potuto verificare
- **iPhone vero**: la sovrapposizione risolta è provata con riquadri in WebKit, non sul telefono. In particolare, l'altezza reale di Safari (barre che compaiono e spariscono) può differire da 664 px; lo spazio riservato è in `dvh`, quindi segue l'altezza utile, ma non l'ho visto su un dispositivo.
- Il foglio di condivisione vero (`navigator.share` simulato) e se «Aggiungi alla schermata Home» compare in quel menu.

## GATE COMPLESSIVO: PASS ✅
