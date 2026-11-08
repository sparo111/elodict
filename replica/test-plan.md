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
