# Piano di prova: Elodict

Aggiornato il 2026-11-08. Regola: si prova solo il NOSTRO clone, mai i server dell'originale.

## Come si esegue
```bash
npm test            # 111 prove sulla logica (Vitest), pochi secondi
npm run test:e2e    # 169 casi nel browser × 2 schermi (computer 1440×900 e telefono 390×844) = 338 esecuzioni
```
Ultimo esito: **111/111** e **333 riuscite + 5 saltate di proposito** (le saltate sono le copie su telefono dei casi che bastano una volta sul computer: controllo di accessibilità e prove con Whisper). Difetti aperti: nessuno (`bugs.md`).

## Come si prova senza microfono
- `FAKE_SPEECH` (`e2e/helpers.ts`) sostituisce il riconoscimento del browser: il test può «far parlare» l'app (`__say`), simulare errori (`__fail`) e fermate (`__browserStop`).
- La casella «Prova senza microfono» passa dallo stesso percorso dei comandi: è l'helper `say()`.
- Chrome parte con un microfono finto (`--use-fake-device-for-media-stream`) per la prova del microfono.
- Per Whisper vero: voci di sintesi di Windows (`e2e/make-fixtures.ps1` crea `e2e/fixtures/speech-en.wav` e `speech-it.wav`, non in git) usate come microfono di un Chrome avviato apposta. Servono internet e quei file; altrimenti le prove si saltano da sole.
- Le misure dei fogli (`f10`, `f11`) leggono la posizione di ogni parola con le misure vere (senza zoom) e controllano che nessuna tocchi i margini, l'intervallo fra i fogli o il margine destro.

## Cosa copre ogni file
| file | casi | cosa si prova |
| --- | --- | --- |
| `e2e/f01-dettatura.spec.ts` | 11 | Detta/Ferma, testo provvisorio, riavvio automatico dopo le pause, lingua del riconoscimento, microfono nella barra, errori (bloccato, assente, «non ti sento», riprova), browser senza riconoscimento |
| `e2e/f02-comandi.spec.ts` | 23 | punteggiatura e maiuscole nelle 4 lingue, cancella (parola, frase, N, «da X a Y»), annulla, a capo, formattazione, simboli, accenti ed emoji, testo lunghissimo, documento vuoto |
| `e2e/f03-impostazioni-aiuto.spec.ts` | 5 | cambio lingua dei menu, persistenza, tastiera, aiuto per lingua |
| `e2e/f05-pulizia-dizionario-pausa.spec.ts` | 22 | pulizia «ehm/uhm» e ripetizioni, dizionario (aggiungi, rimuovi, importa/esporta, file sbagliato), pausa/ripresa/ferma a voce, scorciatoie `Alt+Maiusc+D` ed `Esc` |
| `e2e/f06-backup-lingua-microfono.spec.ts` | 20 | copia di sicurezza (anche in un browser vuoto), cambio lingua al volo (barra, voce, mentre ascolta), prova del microfono, avviso «non arriva testo» |
| `e2e/f07-selezione-elenchi-maiuscolo.spec.ts` | 17 | selezione a voce, maiuscolo/minuscolo (conserva il grassetto), elenchi, «mostra comandi», punto automatico |
| `e2e/f08-offline-whisper.spec.ts` | 11 | scelta offline e persistenza, stato del modello, download fallito, browser senza motore integrato, **trascrizione vera** (EN piccolo, IT piccolo e medio) |
| `e2e/f09-gara-impostazioni.spec.ts` | 2 | scegliere la lingua prima che le impostazioni siano lette (difetto BUG-005): database ritardato di proposito |
| `e2e/f10-foglio-a4.spec.ts` | 19 | misure A4, un solo foglio da vuoto, testo che passa al foglio dopo anche a metà paragrafo, titoli ed elenchi, zoom, esportazione senza spazi di pagina |
| `e2e/f11-a-capo-e-bandierine.spec.ts` | 17 | a capo al margine destro (anche parole lunghissime, indirizzi web), bandierine, menu nelle 4 lingue, voce che segue la bandiera |
| `e2e/export-email.spec.ts` | 13 | esportazione in 5 formati con il nome scelto, «Salva con nome», invio per email (testo corto/lungo, senza Condividi) |
| `e2e/salvataggio-barra-a11y.spec.ts` | 9 | salvataggio dopo il ricaricamento, barra, accessibilità con axe, nessuno scorrimento orizzontale |
| `src/commands/parser.test.ts` | 41 | tutti i comandi nelle 4 lingue, cancella con numeri, formattazione, selezione, elenchi, cambio lingua, punteggiatura attaccata (come la scrive Whisper) |
| `src/speech/segmenter.test.ts` | 16 | taglio delle frasi dalle pause con segnali finti, frasi inventate sul silenzio |
| `src/text/edit.test.ts` | 16 | cancella parole/frasi, intervalli, titolo |
| `src/text/clean.test.ts` | 11 | parole riempitive, ripetizioni, dizionario, importazione |
| `src/export/export.test.ts` | 9 | blocchi → txt/md/html, creazione dei file docx e pdf |
| `src/store/backup.test.ts` | 9 | copia di sicurezza: scrittura, lettura, file sbagliati, valori mancanti |
| `src/editor/PageLayout.test.ts` | 9 | calcolo dei fogli: nessuna riga a cavallo, altezze diverse, righe più alte del foglio |

## Da provare a mano (non automatizzabile qui)
- [ ] **Dettare con un microfono vero** (voce umana, rumore) in Chrome, Edge e Safari, con il motore del browser **e** con Whisper offline.
- [ ] Android Chrome: la frase si ripete? (problema noto della Web Speech API)
- [ ] Aprire i .docx in **Word vero**: titoli, elenchi, grassetto, spazio prima di «?» in francese, foglio A4.
- [ ] Il PDF con molte pagine o parole lunghissime.
- [ ] «Salva con nome» vero in Chrome/Edge (finestra del sistema).
- [ ] «Condividi file» su telefono; «Apri la posta» con il tuo programma di posta.
- [ ] Un lettore di schermo vero (NVDA, VoiceOver).
- [ ] Firefox e Safari veri con Whisper offline.
- [ ] Documenti di molte decine di pagine: i fogli restano scorrevoli?
- [ ] Spagnolo: comandi riletti da un madrelingua.
- [ ] Due schede aperte insieme (vince l'ultimo salvataggio: da decidere).

## T-001 — Installazione, primo avvio, senza internet (file `e2e/pwa-*.spec.ts`, usano la copia costruita)
| caso | cosa si controlla | esito |
| --- | --- | --- |
| P-01 | manifest valido, 3 icone raggiungibili, tipo immagine giusto | riuscita |
| P-02 | service worker attivo; elenco iniziale senza `.wasm` né `ort/`; regola «tieni dopo il primo uso» presente | riuscita |
| P-03 | `installa.html` in 4 lingue; stampata ≤ 1 pagina A4 per lingua | riuscita |
| P-04 | senza internet: riapertura e scrittura nel foglio (casella di prova) | riuscita (solo computer) |
| P-05 | invito simulato del programma: un clic → richiesta di installazione | riuscita |
| P-06 | iPhone (Safari simulato): 3 passi + controllo accessibilità | riuscita |
| P-07 | Firefox simulato: spiegazione; già installata: pulsante e avviso spariscono; «Non ora» | riuscite |
| P-08 | primo avvio: completo, saltato, rifatto da Impostazioni, cambio lingua, microfono rifiutato | riuscite |
| P-09 | nuova versione: avviso, «Aggiorna», testo ancora lì dopo il ricaricamento | riuscita (solo computer) |
| P-10 | sotto `/elodict/`: manifest, icone e file del motore raggiungibili; non alla radice | riuscita |
| U-xx | prove sulla logica: `detect`, `basePath`, tempo stimato, microfono, copia di sicurezza con il nuovo campo | riuscite |
Non coperto: scaricamento vero di Whisper sulla copia costruita e riapertura offline con il modello; installazione su dispositivi veri.


| P-11 | «Cos'è Elodict»: riquadro con titolo e 7 voci in 4 lingue, cambia con le bandierine, axe senza errori (computer e telefono 390 px); frase 1 nel primo avvio; stampa ancora 1 pagina A4 per lingua | riuscita |

| P-12 | dedica: prima riga di `installa.html` (dopo il nome, prima di «Cos'è»), nelle 4 lingue; prima schermata del primo avvio; fondo di Impostazioni (computer e telefono); assente da Markdown, testo e pagina web esportati | riuscita |

## T-002 — Impaginazione su documenti lunghi (`e2e/f12-velocita-50-pagine.spec.ts`, solo computer)
| caso | cosa si controlla | esito |
| --- | --- | --- |
| LAYOUT-P1 | 50 fogli: dopo una modifica (inizio, fine, inizio) l'impaginazione impiega meno di 30 ms | riuscita (3–7 ms) |
| LAYOUT-P2 | come P1 con CPU 4 volte più lenta, soglia 120 ms | riuscita (15–50 ms) |
| LAYOUT-E1 | dopo modifiche in tre punti i fogli sono identici a quelli ricalcolati da zero dopo il ricaricamento; verificata con una modifica sbagliata a mano (la prova fallisce) | riuscita |
| U-measure | `LineCache`: ritrova il blocco, si svuota se cambiano larghezza/zoom, `clear()` | riuscite (3) |
| SEL-R1 | BUG-006: la selezione a voce con il disegno ritardato di mezzo secondo | riuscita |

## T-003 — Scelta del microfono (`e2e/f13-scelta-microfono.spec.ts`, `src/audio/devices.test.ts`)
Dispositivi finti: copione che sostituisce l'elenco e le richieste di apertura; l'audio viene dal microfono finto di Chrome.
| caso | cosa si controlla | esito |
| --- | --- | --- |
| MIC-H1 | l'elenco: predefinito + 2 microfoni, senza telecamera né voci doppie | riuscita (computer e telefono) |
| MIC-H2 | la prova chiede il dispositivo scelto; la scelta resta dopo il ricaricamento | riuscita |
| MIC-H3 | un microfono collegato a finestra aperta compare da solo | riuscita |
| MIC-H4 | tornare a «predefinito» chiede senza identificativo | riuscita |
| MIC-N1 | scelto e poi scollegato: voce «non è collegato», la prova ripiega sul predefinito con avviso e senza errore; richieste: scelto poi predefinito | riuscita |
| MIC-N2 | senza permesso (nomi e id nascosti): avviso; id senza nomi: «Microfono N» | riuscita |
| MIC-N3 | cambiare microfono durante la prova la ferma | riuscita |
| MIC-E1 | la nota «con il browser la scelta non vale» c'è solo con il browser | riuscita |
| MIC-W1 | Whisper vero (modello piccolo): chiede il dispositivo scelto; scollegato durante l'ascolto → riparte con il predefinito e avvisa; riavvio con dispositivo assente → ripiego con avviso (solo computer, si salta senza rete) | riuscita |
| U-devices | 10 prove sulla logica: elenco, `isMissing`, `openMic` (scelto, ripiego, permesso negato non ripiega, nessun microfono) | riuscite |
Non coperto: due microfoni veri, scollegamento vero, Chrome con più dispositivi e il riconoscimento del browser.

## T-004 — Documenti, migrazione, limiti (`e2e/f14-…`, `e2e/f15-…`, `src/documents/documents.test.ts`, `src/store/backup.test.ts`)
| caso | cosa si controlla | esito |
| --- | --- | --- |
| MIG-H1 | database della versione 1 (documento + impostazioni complete) → versione 2: impostazioni identiche campo per campo, documento identico + `openedAt`; l'app usa motore e dizionario salvati | riuscita |
| MIG-H2 | il documento di prima si modifica e si salva | riuscita |
| MIG-H3 | tre documenti vecchi: tutti migrati, si riapre l'ultimo modificato | riuscita |
| MIG-N1 | migrazione che fallisce: avviso, nessun salvataggio, copia scaricabile con i dati di prima, database ancora alla versione 1 e identico; poi, senza guasto, migra senza perdere niente | riuscita |
| LIB-H1…H7 | elenco vuoto/pieno, nuovo, «annulla» non porta testo dell'altro, rinomina (resta e dà il nome al file), nome vuoto, duplica, riapre l'ultimo, salva prima di cambiare | riuscite |
| LIB-S1/S2 | ricerca per testo e titolo, accenti/maiuscole, più parole, nessun risultato | riuscite |
| LIB-T1…T6 | cestino: conferma e annulla, ripristina, elimina per sempre, elimina il documento aperto, unico documento, scadenza a 30 giorni (31 gg sì, 29 gg no), il cestino non compare in elenco/ricerca/avvio | riuscite |
| LIB-L1…L4 | 200 documenti: niente nuovo né duplica; copia di sicurezza a 200 sì (senza cestino), 201 e >20 MB no con avviso | riuscite |
| LIB-A1/A2 | axe su elenco, ricerca, conferme, cestino; testi in inglese, francese, spagnolo | riuscite |
| U-documents | 15 prove: testo semplice, ricerca e pezzetto, cestino, ordine, copie | riuscite |
| U-backup | limiti in scrittura (200/201 documenti, >20 MB), nome scelto, campi interni esclusi | riuscite |
Verifiche con errore introdotto a mano: togliendo il ripristino di «annulla», LIB-H2 fallisce.
Non coperto: quota piena, due schede durante l'aggiornamento, altri browser, database vecchio creato da una vera app vecchia.

## T-004b — Migrazione vera, due schede, agganci per le prove
| caso | cosa si controlla | esito |
| --- | --- | --- |
| MIGV-1 (`npm run test:migrazione`) | l'app di prima (tag `v-prima-di-T004`) crea documento, dizionario di 2 voci, motore offline e microfono; la versione attuale sullo stesso profilo li ritrova identici (database 10 → 20) e li usa | riuscita |
| TAB-B1 (×4 lingue) | un'altra scheda tiene il database: avviso nella lingua dell'app, editor non scrivibile, database ancora com'era (letto con la connessione dell'altra scheda), quando la lascia si va avanti da soli e i dati sono identici | riuscite |
| TAB-S1 (×4 lingue) | un'altra scheda chiede una versione nuova: la scheda vecchia salva ciò che stava scrivendo (senza aspettare il salvataggio automatico), chiude, avvisa; l'altra non resta bloccata; ricaricando il testo c'è | riuscite |
| TAB-B2 | due schede della stessa versione: nessun avviso | riuscita |
| TAB-S2 | dopo l'avviso il database non cambia più | riuscita |
| check:dist | la build pubblicata non contiene i nomi degli agganci; la build di prova sì (così il controllo non è vuoto); il controllo fallisce se li trova | riuscito |
Verifiche con errore introdotto a mano: senza il salvataggio prima della chiusura TAB-S1 fallisce; senza il gestore `blocked` TAB-B1 fallisce.
Non coperto: due vere versioni dell'app aperte insieme; Firefox/Safari; quota piena.
