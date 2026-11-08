# AUDIT_T004b — Tre rinforzi alla migrazione del database

Data: 8 novembre 2026. Nessun push, nessuna licenza scelta, nessun repository creato.

## Numeri prima / dopo

| misura | prima (T004) | dopo |
| --- | --- | --- |
| prove sulla logica | 188 | 188 (nessuna logica pura nuova) |
| prove nel browser | 454 (442 riuscite, 12 saltate) | **475** (463 riuscite, 12 saltate, 0 cadute): +1 migrazione vera, +20 due schede |
| soglie di copertura (`npm run coverage`) | rispettate | rispettate (uscita 0) |
| righe di `src/App.tsx` | 220 | 226 (+6: avviso e blocco della scrittura) |
| `npm audit` | 41 (27 per il codice che arriva agli utenti) | 41 (27): invariato |
| dipendenze nuove | — | nessuna |
| parità con Dictate | 75,9 | 75,9 |

## 1) Migrazione con un database vero — fatto

`e2e/f16-migrazione-vera.spec.ts` (aiuti in `e2e/oldApp.ts`), comando **`npm run test:migrazione`**.
- Crea un `git worktree` staccato al commit **`61b7fe8`** (T003, l'ultimo prima di T004): il ramo `master` e i file di lavoro non vengono toccati. Lo toglie alla fine (verificato: `git worktree list` mostra solo `master`, nessun file in `%TEMP%`, nessun server rimasto acceso).
- La **vera app di prima** (server di sviluppo sulla porta 5210) gira in un profilo persistente di Chromium, con l'interfaccia di prima: salta il primo avvio, detta una frase, aggiunge 2 voci al dizionario, sceglie il motore offline (modello piccolo) e un microfono dell'elenco. Prima di spegnerla si legge il database: **versione 10 (= v1 di Dexie)**, 1 documento, impostazioni complete.
- Spenta la vecchia, la **versione attuale** si apre sullo **stesso indirizzo e profilo**: database **versione 20**; impostazioni **identiche** (`toEqual`); documento identico con in più la sola ultima apertura; nell'interfaccia: testo nell'editor, dizionario con «Elodict» e «Mimma», motore offline e modello piccolo selezionati, **lo stesso microfono**, il documento nell'elenco, nessun primo avvio che ricompare.
- Ripetibile: passa ad ogni lancio (3 lanci di fila: 3 su 3, ~35 s l'uno). Nella corsa completa parte per ultima e da sola: la prima volta girava insieme alle altre e le rallentava tanto che 4 prove (le 3 con Whisper vero e una di esportazione su telefono) sono cadute per il carico; da sole passavano. Con l'ordine "per ultima" la corsa completa è pulita.

## 2) Due schede aperte — fatto

- **Scheda nuova bloccata** (un'altra scheda tiene il database e non lo lascia): dopo mezzo secondo (per non far lampeggiare l'avviso se l'altra si chiude subito) compare **«Elodict è aperto in un'altra scheda: chiudila per continuare»** + «Non è stato perso niente. Appena la chiudi, questa scheda va avanti da sola.»; l'editor non è scrivibile; quando l'altra scheda lascia il database l'avviso sparisce e **si va avanti da soli, senza ricaricare**: database aggiornato alla versione 2, documento e impostazioni identici.
- **Scheda vecchia** (un'altra scheda chiede una versione più nuova o la cancellazione): **salva ciò che stava scrivendo** (senza aspettare il salvataggio automatico), **chiude il database** — così l'altra non resta bloccata —, non permette più di scrivere e mostra **«Elodict è stato aggiornato in un'altra scheda»** con il pulsante «Ricarica la pagina». Ricaricando il testo c'è.
- Avvisi in **italiano, inglese, francese, spagnolo** (provati con la lingua del browser per il caso «bloccata» e con le bandierine per quello «da ricaricare»), su computer e telefono; 5 chiavi nuove uguali nelle 4 lingue.
- Verificato con errore introdotto a mano: senza il salvataggio prima della chiusura la prova TAB-S1 fallisce; senza il gestore `blocked` la prova TAB-B1 fallisce.

## 3) `__ELODICT_FAIL_MIGRATION__` solo nelle build di prova — fatto

- `vite.config.ts` definisce `__ELODICT_TEST_HOOKS__`: **falso** con `vite build` normale (modalità production), vero nel server di sviluppo e con `--mode test` (le copie costruite per le prove: `build:pwa-test`, `build:base-test`). La migrazione legge la variabile solo se è vero.
- **`dist/` non contiene** `__ELODICT_FAIL_MIGRATION__`, `__ELODICT_TEST_HOOKS__` né il messaggio d'errore di prova (38 file controllati, anche dentro i file, non solo nei nomi). La copia di prova (`dist-pwa`) li contiene (2 corrispondenze), così si sa che il controllo non è vuoto; e lo stesso controllo lanciato con «assente» su `dist-pwa` esce con errore (1).
- `scripts/check-test-hooks.mjs` → **`npm run check:dist`**, aggiunto al flusso di pubblicazione subito dopo la costruzione: se qualcosa dovesse tornare nella build pubblicata, la pubblicazione si ferma. (Il flusso non è mai stato eseguito: nessun repository.)

## Le 4 righe

**FUNZIONALE — PASS ✅** — Tutti e tre i rinforzi funzionano e hanno prove che ripetute passano (migrazione vera 3/3; due schede e migrazione costruita a mano 84/84 su computer e telefono, ripetute 3 volte). Corsa completa: 463 riuscite, 12 saltate, 0 cadute.

**SICUREZZA — PASS ✅** — Il guasto simulato non esiste più nella build pubblicata (controllato e bloccato in pubblicazione). Alla chiusura per un'altra scheda si salva prima: nessuna perdita. Il database non si cancella mai; chiuso, rifiuta le scritture. `npm audit`: 41 segnalazioni, **27 toccano il codice che arriva agli utenti** (25 medie, 2 alte: `sharp` solo Node e pezzi di TipTap); le altre 14 sono strumenti di sviluppo; nessuna è nuova.

**QUALITÀ — PASS ✅ (con riserve)** — File piccoli: `dbEvents.ts` 34 righe, `DatabaseNotice.tsx` 32, `db.ts` 140, `useDocumentStore.ts` 161, `oldApp.ts` 73. Nessun `catch` vuoto. Il programma di prova sa far fallire le prove (due errori introdotti a mano). Riserve:
- Il controllo `check:dist` cerca tre testi precisi: se un giorno si rinominano, vanno aggiornati nello script.
- La prova con la versione di prima richiede `git` e un repository con quel commit: in una copia senza storia (per esempio scaricata come zip) non può girare.
- Nella corsa completa è l'ultima, da sola: se le prove prima falliscono, **viene saltata** (così funzionano le dipendenze di Playwright).

**INTEGRAZIONE — PASS ✅** — Tutte le prove esistenti restano verdi (impostazioni, primo avvio, installazione, microfono, elenco dei documenti, esportazioni, copia di sicurezza, `hydratedFor`/BUG-005). La guardia sulla scrittura (`setEditable`) non interferisce con il caricamento normale (verificato da TAB-B2: due schede della stessa versione non mostrano nessun avviso).

## Cosa NON è verificato — in particolare, leggere questo
- **Chi ha già una scheda aperta con una versione di Elodict precedente a questa non vedrà l'avviso «ricarica»**: quella scheda ha codice vecchio, senza il gestore. Con il comportamento standard di Dexie, quando un'altra scheda aggiorna il database la vecchia lo chiude da sola in silenzio, e da quel momento non salva più (l'indicatore di salvataggio mostrerebbe l'errore). Il testo scritto in quella scheda dopo l'aggiornamento andrebbe perso. L'avviso protegge solo da questa versione in poi. Non l'ho provato con due versioni vere aperte insieme (stesso indirizzo, codice diverso), perché richiederebbe due server sullo stesso indirizzo.
- Il caso «bloccata» è provato con una scheda «ostinata» **simulata** (una connessione grezza al database senza gestore); nella pratica un'altra scheda di Elodict si chiude da sola, quindi l'avviso serve soprattutto per schede bloccate o versioni future. Il caso «da ricaricare» è provato con una scheda che chiede la versione 300, al posto di una versione futura dell'app.
- La prova con la versione di prima usa il **server di sviluppo**, non la copia installabile con il suo programma di salvataggio offline (service worker): un aggiornamento vero passa anche da lì.
- Solo **Chromium**. Firefox e Safari non provati (il comportamento degli eventi del database è definito dagli standard ma non l'ho verificato).
- Quota piena; più di due schede; database di decine di MB.

## GATE COMPLESSIVO: PASS ✅
(sul codice e sulle prove automatiche; licenza e pubblicazione restano da decidere con T001d)

## IN ATTESA DI ISTRUZIONE
Non ho iniziato T005. Nessun push, nessuna licenza, nessun repository.
