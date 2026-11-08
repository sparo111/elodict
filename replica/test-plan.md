# Piano di test: mia-dictate

Data: 2026-11-08. Regola: si prova solo il NOSTRO clone, mai i server di Microsoft.
Il microfono vero non è provabile qui: nei test un "finto riconoscimento vocale" (`FAKE_SPEECH` in `e2e/helpers.ts`) fa parlare l'app, e la casella "Prova senza microfono" passa dagli stessi comandi.

Come si esegue: `npx playwright test` (desktop 1440px e telefono 390px) e `npm test` (logica, 39 test).

## F01 Dettare un testo — `e2e/f01-dettatura.spec.ts`
| caso | cosa si prova | esito |
| --- | --- | --- |
| F01-H1 | Detta, parlo, il testo compare, Ferma | ok |
| F01-H2 | due frasi di fila con lo spazio giusto | ok |
| F01-H3 | testo provvisorio visibile, poi sparisce | ok |
| F01-E1 | il browser ferma il microfono: riavvio automatico | ok |
| F01-E2 | la lingua scelta arriva al riconoscimento (it-IT) | ok |
| F01-E3 | il microfono nella barra = tasto grande | ok |
| F01-E4 | browser senza riconoscimento vocale: avviso, tasti spenti, casella di prova funziona | ok |
| F01-N1 | microfono bloccato: messaggio chiaro | ok |
| F01-N2 | "non ti sento": avvisa e continua ad ascoltare | ok |
| F01-N3 | nessun microfono collegato | ok |
| F01-N4 | Riprova dopo un errore | ok |

## F02 Correggere a voce, 4 lingue — `e2e/f02-comandi.spec.ts`
| caso | cosa si prova | esito |
| --- | --- | --- |
| F02-H1..H3 | punteggiatura, cancella parola, annulla, cancella frase | ok (dopo fix BUG-002) |
| F02-H4 | a capo e nuovo paragrafo | ok (dopo fix BUG-001) |
| F02-H5..H7 | inglese, francese (spazio prima di ?), spagnolo (¿) | ok |
| F02-H8 | la lingua scelta resta dopo il ricaricamento | ok |
| F02-E1 | accenti ed emoji | ok |
| F02-E2 | frase vuota | ok |
| F02-E3 | testo lunghissimo (3000 parole) | ok |
| F02-E4 | invio doppio rapido | ok |
| F02-E5 | cancella/annulla su documento vuoto | ok |
| F02-E6 | cursore a metà testo | ok (controlla solo che il testo compaia) |

## F03/F04 Impostazioni e aiuto — `e2e/f03-impostazioni-aiuto.spec.ts`
Cambio lingua app (4 lingue), persistenza, Esc/tastiera, elenco comandi nella lingua scelta, pulsante Chiudi: tutti ok.

## Esporta e Invia — `e2e/export-email.spec.ts`
| caso | cosa si prova | esito |
| --- | --- | --- |
| EXP-H1 | tutti e 5 i formati scaricati col nome scelto; docx = zip, pdf = %PDF | ok |
| EXP-H2 | nome proposto = titolo | ok |
| EXP-E1..E5 | documento vuoto, caratteri vietati, nome vuoto, accenti/emoji, grassetto in markdown | ok |
| EXP-P1/P2 | "Salva con nome" (simulato): nome proposto, file scritto; annullo = niente | ok |
| MAIL-E1..E3, H1 | vuoto, testo corto, testo troppo lungo (pulsante spento), senza Condividi | ok |

## Salvataggio, barra, accessibilità, telefono — `e2e/salvataggio-barra-a11y.spec.ts`
Salvataggio dopo ricarica, app funzionante senza IndexedDB, annulla/ripeti, grassetto/corsivo/sottolineato, elenchi e titolo, il cursore resta, scansione axe (pagina, errore, 4 finestre), nessuno scorrimento orizzontale a 390px: tutti ok.

## Da provare a mano (non automatizzabile qui)
- [ ] Dettare con un microfono vero in Chrome, Edge e Safari (qualità, comando o parola?).
- [ ] Android Chrome: la frase si ripete? (problema noto della Web Speech API)
- [ ] Aprire i .docx in Word vero e controllare titoli, elenchi, grassetto, spazio prima di "?" in francese.
- [ ] Il PDF con parole lunghissime o molte pagine.
- [ ] "Salva con nome" vero in Chrome/Edge (finestra del sistema).
- [ ] "Condividi file" su telefono; "Apri la posta" con il tuo programma di posta.
- [ ] Due schede aperte insieme: vince l'ultimo salvataggio (da decidere).
- [ ] Lettore di schermo vero (NVDA / VoiceOver).
- [ ] Firefox: l'avviso compare.
