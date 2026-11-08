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
