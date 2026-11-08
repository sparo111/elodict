# Registro di costruzione

| ID | data | stato | cosa manca | cosa è stato più difficile |
| --- | --- | --- | --- | --- |
| Shell | 2026-11-08 | fatto | rotte multiple (c'è una sola pagina), tema scuro | niente |
| M1 / S01 editor | 2026-11-08 | fatto (base) | autosalvataggio, sola lettura, tabelle/liste | il posizionamento di spazi e maiuscole attorno al cursore |
| M1 / S02 pulsante Detta | 2026-11-08 | fatto (base) | scorciatoia da tastiera, pausa/ripresa | riavvio automatico del microfono |
| S06 errori microfono | 2026-11-08 | fatto | niente | |

## M2 (2026-11-08)
| area | stato | note |
| --- | --- | --- |
| Lingue EN IT FR ES (comandi + interfaccia) | fatto (base) | spagnolo da riassunto Microsoft, da far rivedere a un madrelingua. i18n scritto a mano (`src/i18n.ts`) invece di i18next: più leggero, stesse chiavi per tutte le lingue |
| Impostazioni (lingua parlata, lingua app) | fatto | microfono a scelta, punteggiatura auto, filtro parolacce: M3 |
| Salvataggio automatico | fatto | IndexedDB, solo l'ultimo documento; elenco documenti: M3 |
| Esporta docx/pdf/md/txt/html | fatto | verificato con test automatici (file validi); NON aperto in Word vero. PDF senza grassetto/corsivo |
| Invia per email | fatto | mailto (limite ~1800 caratteri) + Condividi file dove il dispositivo lo permette |
| Aiuto comandi | fatto | solo da pulsante, non a voce |
| Casella "Prova senza microfono" | fatto (extra) | fa passare il testo scritto dagli stessi comandi: utile per provare senza microfono |
| Comandi cancella parola/frase, annulla | fatto | parole nostre, non di Microsoft |

Il bundle JS principale era 597 kB (188 kB compresso) a quel punto; docx e PDF si caricano solo quando servono.

> Le liste «cosa non è verificato» e «prossimi passi» aggiornate sono in `RIEPILOGO.md` (sezioni 15 e 16); sotto, per ogni tappa, ciò che era vero in quel momento.

## M2c (2026-11-08) — chiuse le funzioni obbligatorie
- Cancella N parole/frasi ("cancella 3 parole") e cancella da X a Y, in 4 lingue (`src/commands/syntax.ts`). Limite: in "da X a Y" la parte Y è tutto il resto della frase detta, quindi il comando va detto da solo.
- Formattazione a voce: grassetto / corsivo / sottolineato / rimuovi formattazione su "questo" (ultimo testo detto), "ultima parola", "ultima frase".
- Simboli, valuta e matematica nelle 4 lingue.
- Aiuto: nuova sezione con esempi per ogni lingua.
- Test: 54 sulla logica, 120 nel browser (desktop + telefono), tutti verdi. Difetto trovato e corretto: BUG-004.
- Resta non verificato: voce vera, Word vero, spagnolo da madrelingua.

## M2d (2026-11-08) — idee dai concorrenti GitHub (vedi competitors.md)
- Pulizia del testo: toglie "ehm/uhm" (acceso), ripetizioni (spento); dizionario personale con importa/esporta; impostazioni salvate (`src/text/clean.ts`).
- Pausa/ripresa/ferma a voce in 4 lingue; pulsante Riprendi; scorciatoie Alt+Maiusc+D ed Esc.
- Test: 66 sulla logica, 164 nel browser (desktop + telefono), tutti verdi.
- Limite scoperto: la scelta del microfono non è possibile con il riconoscimento del browser.
- Non verificato: voce vera; quanto le liste di "ehm/uhm" corrispondano a ciò che il riconoscimento vero scrive (alcuni motori li tolgono già da soli).

## M2e (2026-11-08) — dalle recensioni delle app che registrano (vedi fixes-recorders.md)
- Copia di sicurezza: scarica/ripristina un file JSON con tutti i documenti e le impostazioni; il file viene controllato prima e non importa niente a metà (`src/store/backup.ts`). Promemoria sempre visibile.
- Cambio lingua al volo: selettore nella barra e comandi "passa all'inglese", "switch to italian", "passe en français", "cambia a español". Se stava ascoltando, il microfono riparte nella nuova lingua; i vecchi eventi del microfono vengono ignorati per evitare stati sbagliati.
- Prova del microfono (Impostazioni): barra di livello, nome del microfono, messaggi per bloccato / assente / silenzioso; il microfono si spegne chiudendo la finestra.
- Avviso "ascolto ma non arriva testo" dopo 10 s (non in pausa), con scorciatoia alla prova del microfono; anche "non ti sento" la offre.
- Test: 74 sulla logica, 204 nel browser (desktop + telefono), tutti verdi. Nessun difetto nuovo trovato in questo giro.
- Non verificato: voce vera; il comportamento del cambio lingua con il riconoscimento vero di Chrome (nel test il riconoscimento è simulato); la barra di livello con microfoni reali (nel test c'è un microfono finto di Chrome).

## M3 / C (2026-11-08) — funzioni piccole
- Selezione a voce (tutto, ultima parola, ultima frase, deseleziona), maiuscolo/minuscolo su "questo / ultima parola / ultima frase" (conserva grassetto e corsivo), elenchi (puntato, numerato, voce successiva, esci), "mostra comandi", punto automatico facoltativo (regola semplice).
- Test: 102 sulla logica, 238 nel browser.

## M4 / B (2026-11-08) — riconoscimento offline con Whisper nel browser
- Scelta in Impostazioni: "il browser" (veloce, serve internet) oppure "offline" (Whisper via Transformers.js 3.8, onnxruntime-web, solo CPU/WebAssembly). Modelli: piccolo (Xenova/whisper-tiny, ~40 MB) e medio (Xenova/whisper-base, ~80 MB, scelto di partenza). Download una volta da huggingface.co, poi nella memoria del browser; tasto per eliminarli.
- I file del motore (onnxruntime) sono copiati in `public/ort` da `scripts/copy-ort.mjs` (a `npm run dev` e `npm run build`): il sito non carica codice da altri siti, solo i pesi del modello.
- Il microfono è ascoltato con AudioWorklet; `src/speech/segmenter.ts` taglia le frasi dalle pause (700 ms) e scarta il rumore; il modello gira in un lavoratore (`whisper.worker.ts`); `cleanWhisperText` scarta le frasi inventate sul silenzio ("Thank you", "[BLANK_AUDIO]"…).
- I comandi vocali funzionano anche con la punteggiatura che Whisper attacca alle parole ("virgola," = virgola).
- **Provato davvero** con voci di sintesi di Windows (script `e2e/make-fixtures.ps1`) come microfono finto di Chrome: EN «Hello world! This is a test of the offline dictation.» (perfetto); IT modello medio «Ciao a tutti! Questa è una prova della dettatura» (perfetto); IT modello piccolo «…della ditatura» (1 parola sbagliata).
- BUG-005 trovato e corretto (vedi bugs.md).
- Test: 102 sulla logica (16 sul taglio delle frasi), 261 nel browser (5 saltate di proposito).
- **Non verificato:** voce umana vera (la sintesi è molto più pulita); microfoni veri e rumore; computer lenti (con Whisper medio la risposta può arrivare con secondi di ritardo); Firefox e Safari veri (simulati togliendo il riconoscimento integrato); WebGPU (non usato); uso con la pagina pubblicata online (il file del motore pesa 22 MB, sotto il limite di 25 MB dei servizi gratuiti più comuni).
- **Limiti noti:** la scelta del microfono ancora non c'è (usa quello predefinito); il testo arriva a fine frase, non parola per parola (Whisper non lavora a flusso); la prima volta c'è il download del modello.

## M5 (2026-11-08) — il foglio A4 e le bandierine (richieste dell'utente)
- **Foglio A4 vero**: 794 x 1123 px (21 x 29,7 cm a 96 dpi), margini di 2,54 cm, fogli bianchi impilati su una "scrivania", numero di pagina «n / N».
- **A capo a fine foglio**: il testo scorre in una colonna sola e alla fine dell'area utile si inserisce uno spazio (margine in basso + intervallo + margine in alto), così la riga dopo parte dal foglio successivo, **anche a metà di un paragrafo** (`src/editor/PageLayout.ts`, calcolo puro provato con 9 prove numeriche). Gli spazi sono solo decorazioni: non finiscono nel documento né nei file esportati.
- **A capo a fine riga**: il testo andava già a capo al margine destro del foglio; ora è misurato (nessuna parola supera 698 px né scende sotto 96 px) e anche una parola lunghissima senza spazi si spezza.
- **Zoom** del foglio (Adatta, 75-150%). "Adatta" riduce il foglio sul telefono.
- **Bandierine** accanto al nome (IT, EN, FR, ES, disegnate in SVG perché su Windows le "emoji bandiera" appaiono come lettere): scelgono insieme la lingua dei menu e quella della voce. Il menu a tendina della barra permette ancora di dettare in una lingua diversa da quella dei menu.
- Esportazione: anche Word e PDF ora sono A4 con margini di 2,54 cm.
- Difetti trovati mentre lo costruivo (non arrivati all'utente): (1) il metodo per trovare l'inizio di ogni riga funzionava solo per le righe visibili sullo schermo; (2) con il foglio rimpicciolito sul telefono, le misure ingrandite e quelle vere venivano mescolate e tutte le righe si fondevano in una: trovati con le prove su telefono.
- Test: 111 sulla logica, 333 nel browser (5 saltate di proposito).
- **Non verificato**: l'aspetto con altri font o su schermi molto grandi; la stampa dal browser (non è stata progettata: si usa Esporta); documenti di molte decine di pagine (il calcolo dei fogli rilegge tutte le parole a ogni modifica: su testi molto lunghi può diventare lento); la divisione in sillabe (le parole non si spezzano con il trattino, vanno a capo intere salvo quelle lunghissime).

## T-001 — Installazione facile (PWA)
- Fatto: manifest «Elodict», icone da `favicon.svg` (script rilanciabile), copia dell'app per l'uso senza internet (motore Whisper fuori dalla copia iniziale, tenuto dopo il primo uso), indirizzi del motore con sottocartella (`/elodict/`), pulsante «Installa» (5 casi), pagina `installa.html`, primo avvio in 3 schermate, avviso di nuova versione che salva prima di ricaricare, «Rifai la configurazione», flusso GitHub Pages.
- Scelta diversa dalla richiesta: nel primo avvio «Privato» scarica il modello **medio (~80 MB)** e lo dice, non il piccolo da 40 MB: in italiano il piccolo ha sbagliato una parola nella prova. Si cambia in una riga (`ONBOARDING_MODEL`).
- Più difficile del previsto: il pacchetto `dist` contiene ancora un file `.wasm` da 21 MB con nome a codice che l'app non usa (non è nella copia iniziale, ma pesa sul sito pubblicato). Da togliere in un secondo momento, dopo una prova con Whisper vero sulla copia costruita.
- Non fatto: pubblicazione online (serve la tua decisione); installazione su dispositivi veri.


## T-001b — «Cos'è Elodict»
- Riquadro con 7 frasi in cima a `installa.html` (4 lingue) e frase n. 1 nella schermata della lingua del primo avvio. Testi identici a quelli ricevuti, nessuna correzione necessaria.
- Una sola sorgente: i testi stanno in `src/i18n.ts` (`whatTitle`, `what1`..`what7`); un plugin in `vite.config.ts` li scrive in `public/installa-testi.js` (file generato, ignorato da git) a ogni avvio o costruzione, e la pagina statica lo carica.
- Per stare in un foglio A4 (francese in due pagine) ho ridotto margini e spazi e poi i passi di installazione a 14 pt; il riquadro è a 14,5 pt.

## T-001c — Dedica
- Frase di dedica (chiave `dedication` in `src/i18n.ts`, 4 lingue, testo italiano dell'autore invariato) in: `installa.html` (prima riga dopo il nome, prima di «Cos'è Elodict», corsivo centrato), prima schermata del primo avvio, in fondo a Impostazioni, in cima al README. Non entra nei documenti né nelle esportazioni.
- La pagina statica la riceve da `public/installa-testi.js` (stesso meccanismo di T-001b).
- Per tornare a 1 foglio A4 per lingua: margini e spazi ridotti, titoli e passi di installazione più piccoli (13 pt). Dedica (14 pt) e riquadro (14,5 pt) invariati.

## T-002 — App.tsx diviso, impaginazione incrementale
- `App.tsx` da 671 a ~210 righe. Nuova cartella `src/app/`: `applyTranscript.ts`, `useSettings.ts`, `useDocumentStore.ts`, `useDictation.ts`, `useBackupActions.ts`, `useToast.ts`, `Header`, `Notices`, `TryBox`, `TalkBar`, `AppDialogs`. `Dialogs.tsx` (382 righe) diviso in `components/dialogs/` (4 file). Nessun file nuovo supera 180 righe (`i18n.ts`, 880 righe, è solo l'elenco dei testi e non è stato toccato).
- Impaginazione: `measure.ts` ricorda le righe misurate per blocco (`LineCache`, chiave = larghezza + zoom; svuotata a caratteri caricati). Dopo una modifica si rimisura solo il blocco cambiato. `planPages` è rimasta pura e identica.
- Tempi su un documento di 50 fogli (300 paragrafi), per una modifica: **prima 50–60 ms, dopo 3–7 ms**; con computer 4 volte più lento **prima 250–285 ms, dopo 15–50 ms**. Soglia delle prove: 30 ms (120 ms col computer lento).
- Cambio di comportamento (voluto): due scelte di impostazione fatte nello stesso istante ora si sommano, prima la seconda poteva cancellare la prima (`useSettings` tiene sempre l'ultimo valore).
- Più difficile del previsto: niente di grave. Nota: la misura dei tempi resta nel codice (`performance.measure("pageLayout.run")`), costo trascurabile.

## T-003 — Scelta del microfono
- Nuova cartella `src/audio/`: `devices.ts` (`listMics`, `isMissing`, `openMic`) e `useMics.ts` (elenco che si aggiorna con `devicechange`). `openMic` chiede il dispositivo scelto (`deviceId: { exact }`); se non c'è più (`OverconstrainedError`/`NotFoundError`) apre il predefinito e lo segnala. Permesso negato e «nessun microfono» passano come errori veri, senza ripiego.
- Impostazione `microphoneId` (vuoto = predefinito), nel salvataggio e nella copia di sicurezza (lunghezza ≤ 300, altrimenti vuoto). Se ripristinata su un altro computer, il microfono non c'è e si ripiega con avviso.
- Scelta in Impostazioni, dentro «Prova del microfono» (elenco: predefinito + ingressi audio, senza voci virtuali né telecamere). La prova usa il microfono scelto. Se la scelta non è più collegata l'elenco la mostra come «non è collegato (uso quello predefinito)». Prima del permesso il browser nasconde nomi e identificativi: l'app lo dice.
- Whisper: usa il microfono scelto; se all'avvio manca → predefinito + avviso («Il microfono scelto non è collegato…»); se si scollega mentre si ascolta → `onLost` rimette in coda le ultime parole e riparte da solo con il predefinito, con avviso. Gli avvisi non fermano l'ascolto (`onNotice`, nuovo gestore opzionale).
- Con «Il browser» a dettare la scelta non vale (il riconoscimento del browser non lo permette): l'app lo scrive sotto l'elenco, solo quando è scelto il browser.
- `whisper.ts` portato a 256 righe spostando il programma audio in `speech/worklet.ts`.
- Più difficile del previsto: niente. Scartato: ripartire con l'altro microfono anche con il browser (non si può).

## T-004 — Elenco dei documenti con ricerca
- Prima di cambiare lo schema: `e2e/f14-migrazione-database.spec.ts` (MIG-H1/H2), scritta e fatta passare **sullo schema attuale**, che parte da un database della versione 1 con un documento e impostazioni complete (dizionario, microfono scelto, motore…). Poi schema v2 e la stessa prova, resa più severa (versione del database, migrazione eseguita).
- Schema v2: indice su `deletedAt`; migrazione `migrateToV2` aggiunge `openedAt = updatedAt` ai documenti già presenti, nient'altro. Se non riesce: nessuna cancellazione (la modifica di schema è una sola transazione, si annulla tutta), `DatabaseProblem` avvisa, non si salva niente e si offre «Scarica la copia di sicurezza» letta con `rawBackup.ts` senza passare dalla migrazione.
- Punto di innesco per provare il guasto: `window.__ELODICT_FAIL_MIGRATION__` (letto solo in `store/migrations.ts`). Scelto perché Dexie 4 apre senza errori anche un database di versione più alta, quindi non c'è un guasto «naturale» da riprodurre.
- Elenco (`documents/ui`): titolo, data, prime parole; apri, nuovo, rinomina, duplica, elimina con conferma → cestino 30 giorni (ripristina / elimina per sempre con conferma); ricerca per più parole, senza maiuscole e accenti, con la parola evidenziata (`<mark>`). Un documento nuovo entra nell'elenco solo quando ci si scrive.
- Cambiare documento: salva prima quello aperto; `editorSwap.replaceDocument` azzera la cronologia di «annulla» (altrimenti «annulla» riporterebbe il testo dell'altro documento: provato togliendo il ripristino). Un nome scelto dall'utente non viene più riscritto dal salvataggio automatico (`titleCustom`) e vale come nome del file esportato.
- Limiti: 200 documenti (nuovo e duplica si fermano con un avviso) e copia di sicurezza solo se entra nei limiti (200 documenti, 20 MB): se non entra, nessun file e un messaggio che dice cosa fare. Il cestino non entra nella copia.
- Copertura: `vite.config.ts` ha soglie (righe 90 %, rami 80 %) cartella per cartella sulla logica pura; `src/documents/` è stata tenuta pura spostando le schermate in `documents/ui/`.
- Più difficile del previsto: axe segnalava che il testo visibile del pulsante «apri» non era nel nome accessibile → il pulsante ora contiene solo il titolo. Nessun altro intoppo.

## T-004b — Tre rinforzi alla migrazione
- **Database vero**: `e2e/f16-migrazione-vera.spec.ts` (+ `e2e/oldApp.ts`). Crea un `git worktree` staccato al commit `61b7fe8` (ultimo prima di T004), con `node_modules` fatto di collegamenti a quello vero tranne la memoria di Vite (`.vite`), così i due server non si pestano i piedi; avvia il suo server di sviluppo sulla porta 5210; in un profilo persistente di Chromium crea con l'interfaccia di prima un documento, due voci di dizionario, motore offline e un microfono scelto; ferma il server e apre la versione attuale **sullo stesso indirizzo e profilo**: impostazioni identiche, documento identico + ultima apertura, tutto visibile nell'interfaccia. Si rilancia con `npm run test:migrazione`; nella corsa completa parte per ultima e da sola (se girava insieme alle altre rallentava le prove con Whisper fino a farle cadere). Alla fine rimuove worktree, profilo e server.
- **Due schede**: `store/dbEvents.ts` + gestori in `store/db.ts`. `blocked` → dopo mezzo secondo (per non lampeggiare) la scheda nuova mostra «Elodict è aperto in un'altra scheda: chiudila per continuare», non si scrive, e va avanti da sola quando l'altra lascia il database. `versionchange` → la scheda vecchia **salva, chiude il database** (altrimenti l'altra resta ferma), non permette più di scrivere e chiede di ricaricare («Elodict è stato aggiornato in un'altra scheda»). Testi in 4 lingue.
- **Agganci per le prove**: `__ELODICT_TEST_HOOKS__` definito in `vite.config.ts` (falso con `vite build` normale, vero nel server di sviluppo e con `--mode test`); la variabile `__ELODICT_FAIL_MIGRATION__` è letta solo se vero. `npm run build:*-test` usano `--mode test`. `scripts/check-test-hooks.mjs` cerca i nomi in tutti i file di una cartella; `npm run check:dist` (anche nel flusso di pubblicazione) fallisce se li trova nella build pubblicata.
