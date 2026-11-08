# AUDIT_T001d — Licenza e pubblicazione su GitHub Pages

Data: 8 novembre 2026.

## Indirizzo pubblico
- **Sito**: https://sparo111.github.io/elodict/
- **Pagina «Come si installa»** (da stampare, 4 lingue): https://sparo111.github.io/elodict/installa.html
- **Codice sorgente** (pubblico, licenza AGPL-3.0): https://github.com/sparo111/elodict — ramo `main`, GitHub riconosce la licenza («GNU Affero General Public License v3.0»), HTTPS imposto.

## Le 4 righe

**FUNZIONALE — PASS ✅**
- Il sito pubblicato risponde e funziona. Verificato online con 8 prove Playwright (`SITE_URL=https://sparo111.github.io/elodict/ npx playwright test --project=sito-pubblicato`), tutte riuscite: pagina 200 e app che parte senza errori; «Prova senza microfono» scrive nel foglio; `installa.html` in 4 lingue con dedica, «Cos'è Elodict» e axe senza errori; manifest valido con `start_url` e `scope` = `/elodict/`; icone; service worker registrato con scope `/elodict/`; i file `ort/*.wasm` (11 MB e 21,6 MB) rispondono 200 da `/elodict/ort/`, mentre `/ort/…` alla radice dà 404; riapertura **senza internet** dopo la prima visita; collegamento al sorgente e dedica in Impostazioni; e **con Whisper vero** (modello piccolo, voce di sintesi) tutte le richieste del motore vanno a `/elodict/ort/` e nessuna alla radice.
- Prove locali prima di pubblicare: 194 sulla logica (con le soglie di copertura), 467 nel browser riuscite (20 saltate di proposito: 12 delle prove su telefono/Whisper e 8 che servono `SITE_URL`), 0 cadute; la prova della migrazione vera riuscita con il tag `v-prima-di-T004`.

**SICUREZZA — PASS ✅ (con note)**
- Nessun segreto, nessuna email personale, nessun file grande (>5 MB) in tutta la cronologia; autori solo con l'indirizzo riservato di GitHub (`…@users.noreply.github.com`).
- **Storia riscritta prima della prima pubblicazione** (`git filter-repo`): tolti `replica/reviews.csv` e `replica/reviews-recorders.csv` da tutti i commit (ora in `replica/privato/`, ignorata) e sostituito il percorso del computer e il nome utente. Verificato: cercando il nome utente del computer in `git log --all -p` (messaggi dei commit compresi) le occorrenze sono **0**; i due file in nessun commit; `git fsck` pulito. **Copia di sicurezza della storia di prima**: `elodict-prima-della-riscrittura.bundle`, nella cartella accanto a quella del progetto (569 KB, verificata con `git bundle verify`; contiene anche i due file e il vecchio percorso: **non pubblicarla**).
- La build pubblicata non contiene gli agganci per le prove (`npm run check:dist`, eseguito anche dal flusso a ogni pubblicazione: passato).
- `npm audit`: 41 segnalazioni, **27 toccano il codice che arriva agli utenti** (25 medie, 2 alte: `sharp`, usato solo in Node, e pezzi di TipTap); le altre 14 sono strumenti di sviluppo; invariato.
- Note: (1) `replica/fixes.md` e `replica/fixes-recorders.md` (pubblici) contengono ancora circa 23 righe con **brevi citazioni letterali di recensioni, con il link alla fonte**: i riassunti restano, come deciso. (2) Il flusso di GitHub mostra un avviso su Node 20 (le azioni `checkout`, `setup-node`, `deploy-pages` vengono forzate a Node 24): non blocca nulla ma va tenuto d'occhio.

**QUALITÀ — PASS ✅ (con una nota)**
- **Primo flusso fallito, secondo riuscito** (1 fallimento su 3 permessi): le prove sulla logica su GitHub (Node 20) si fermavano perché `listMics()` leggeva `navigator`, che lì non esiste. Era una fragilità vera del codice: prova scritta prima (falliva anche sul mio Node 24 stubbando `navigator`), poi corretto (`browserDevices()`); nel secondo flusso build, prove con soglie, controllo `check:dist` e deploy sono passati (57 s).
- Altra correzione trovata nei controlli: Git Bash trasforma `VITE_BASE=/elodict/` in un percorso di Windows e produceva un sito con indirizzi sbagliati; ora `normalizeBase` lo rifiuta con un messaggio che dice cosa fare (`MSYS_NO_PATHCONV=1`), con prova.
- Ordine di pubblicazione diverso da quello indicato, di proposito: ho creato il repository, **attivato Pages e poi fatto il push**, invece di `--push` subito. Altrimenti il primo flusso sarebbe fallito per certo (Pages non ancora attivo). Gli stessi comandi, in ordine diverso.
- `git filter-repo` non era installato: l'ho installato con pip (strumento di Git, non dipendenza del progetto). Un tentativo di provare le prove con un Node 20 scaricato al volo (`npx node@20`) è stato bloccato dal sistema e non l'ho aggirato: il flusso di GitHub ha fatto da prova con Node 20.
- Nota: il tag `v-prima-di-T004` è stato pubblicato insieme al ramo (serve alla prova della migrazione vera). La prova può girare da una copia clonata solo se i tag vengono scaricati (`git fetch --tags`).

**INTEGRAZIONE — PASS ✅** — Licenza (`LICENSE`, `package.json`, collegamento in Impostazioni con indirizzo unico in `src/legal.ts`), dedica, prove esistenti, soglie di copertura e controllo degli agganci convivono nel flusso di pubblicazione. I documenti (`README`, `RIEPILOGO`, `build-log`, `test-plan`, `AUDIT_*`) sono stati aggiornati: indirizzi pubblici, nuovi codici dei commit dopo la riscrittura (mappa di `filter-repo`), i due file delle recensioni dichiarati non pubblici.

## Cosa NON ho potuto verificare online
- **Installazione vera** su un iPhone, un Android fisico o un Edge/Chrome veri su Windows (nelle prove l'evento di installazione e Safari iPhone sono simulati). Non ho provato il sito pubblicato con la larghezza del telefono (390 px): lì le prove sono state fatte solo in locale.
- **Voce umana**: Whisper è provato con una voce di sintesi; il riconoscimento del browser (Chrome) con una voce vera, mai.
- **Aggiornamento vero** (nuova versione pubblicata mentre l'app è installata): provato solo in locale con una versione finta.
- Firefox e Safari. La stampa su carta di `installa.html`.
- Il sito resta in cache per circa 10 minuti (`Cache-Control: max-age=600`) dopo ogni nuova pubblicazione.

## GATE COMPLESSIVO: PASS ✅

## Messaggio pronto per WhatsApp o email
> Ciao! Ti ho preparato Elodict: un programma gratuito per scrivere con la voce. Parli e il testo compare su un foglio, come in Word, e poi lo puoi salvare, stampare o mandare per email.
> Per metterlo sul tuo computer o sul telefono segui questa pagina, con i passaggi grandi e chiari: https://sparo111.github.io/elodict/installa.html
> Non serve registrarsi e non costa niente. Se ti blocchi, scrivimi!

## IN ATTESA DI ISTRUZIONE
Non ho iniziato T005.
