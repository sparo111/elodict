# AUDIT_T013c — La pagina di prova Parakeet su iPhone: dire dove si ferma

Data: 9 novembre 2026. Pagina: **https://sparo111.github.io/elodict/prova-parakeet/** (stesso indirizzo di prima). L'app e il suo motore predefinito non sono toccati.

## Il problema, come l'ho capito
Su iPhone (Safari, iOS 18.7, 4 core, non isolata, WebGPU presente) Whisper base finisce (RTF 0,46; errori sulle parole 8,9%; encoder ≈ 2,5 s a frase), ma Parakeet piccolo (`olicorne-w2a8`) **non produce nessuna riga**; con WebGPU spuntato la prova si fermava alla seconda frase.
**Fatto sul codice di prima:** una prova senza righe e senza errore vuol dire che la funzione che la esegue **non è mai terminata**: o il lavoratore si era fermato in silenzio (la pagina aspettava per sempre: non c'era nessun tempo massimo) oppure la pagina stessa è stata chiusa o ricaricata dal browser. Il codice non aveva modo di distinguere i due casi.

## Cosa ho fatto (punti 1–6)

| Punto | Fatto | Dove |
|---|---|---|
| 1 diario in `localStorage` prima di ogni fase (motore + fase + ora); all'avvio «Ultima prova interrotta a: …» in cima e dentro «Copia i risultati» | **sì**. Le fasi: scaricamento file N di M (nome e MB, aggiornato a ogni file e ogni 20 MB), configurazione e creazione delle sessioni onnxruntime (preprocessore, encoder, decoder), preparazione audio, encoder, decoder, «frase N/5». Il diario ricorda anche come era stata aperta la pagina (`navigate`/`reload`), l'ultimo `pagehide`/cambio di visibilità, gli errori visti e le ultime fasi | `prova-parakeet/src/journal.ts`, `main.ts` |
| 2 tempo massimo per fase: scaricamento 10 min, sessione 2 min, frase 2 min → ERRORE con la fase, avanti con la prossima | **sì**; si possono accorciare con `?t_download=`, `?t_session=`, `?t_run=` (secondi) per le prove. Ogni avanzamento dello scaricamento rimette a zero il tempo | `main.ts` (`runConfig`) |
| 3 tutti gli errori del lavoratore e di onnxruntime, con il messaggio completo | **sì**: eccezioni non gestite, `unhandledrejection`, `messageerror`, `console.warn/error` del lavoratore (dove scrive onnxruntime), richieste di file `.wasm/.mjs/.onnx/.json` andate male (HTTP o rete), `worker.onerror` con file, riga e colonna, e gli errori della pagina. Compaiono nella tabella («ERRORE (fase «…»)»), in «Copia i risultati» (sezione «Errori e messaggi (completi)») e nel diario | `workerCommon.ts`, `main.ts` |
| 4 pulsante «Prova solo Parakeet piccolo» (salta Whisper e le prove sulle pause) | **sì**, 1 thread | `index.html`, `main.ts` |
| 5 cause probabili per Safari + una correzione provata | vedi sotto: ipotesi, e una **modalità a poca memoria** (non provata su iPhone) | `src/speech/parakeet/parakeet.ts` |
| 6 prove automatiche in WebKit, audit, commit, push, pubblicazione | **sì** | `e2e/g4-pagina-diagnosi.spec.ts` |

**Sonda del dispositivo** (aggiunta, utile a distinguere le ipotesi): all'inizio di ogni prova la pagina scrive nei risultati se il browser accetta WebAssembly SIMD e le eccezioni, se riesce ad allocare 256 MB di memoria WebAssembly e 128 MB di buffer, e come era stata aperta.

## Prove (WebKit con il profilo iPhone 15)
Il WebKit di Playwright **non è Safari su iPhone** e gira su Windows; le prove usano un **motore finto** (`?sim=finto,...`) che attraversa le stesse fasi dei motori veri e può bloccarsi o rompersi di proposito, più un errore **vero** di onnxruntime.

| Prova | Cosa verifica | Esito |
|---|---|---|
| 1 | il diario scrive la fase prima di ognuna; la pagina viene **ricaricata a metà** (come farebbe Safari) → al riavvio compare «Ultima prova interrotta a: parakeet-olicorne-w2a8 … creazione della sessione», «aperta come: reload», è in cima (sopra «Avvia la prova») e dentro «Copia i risultati»; dopo una prova finita bene il banner non c'è | ✅ |
| 1b | l'ordine delle fasi nel diario: scaricamento file 1 di 3 … 3 di 3 → sessione → preparazione audio → encoder → decoder → frase 1/5 | ✅ |
| 2 | tempo massimo: sessione bloccata (Whisper **e** Parakeet finiscono con ERRORE «tempo scaduto (2 s…) nella fase «creazione della sessione»» e la pagina arriva in fondo); scaricamento bloccato (fase «scaricamento file 2 di 3»); frase bloccata (fase «preparazione dell'audio»); i pulsanti restano utilizzabili | ✅ |
| 3 | eccezione del lavoratore, promessa rifiutata, errore non gestito (che ferma il lavoratore) e errori della pagina: tutti con il messaggio completo, nella tabella, nel testo da copiare e nel diario | ✅ |
| 3b | errore **vero** di onnxruntime-web con file del modello non validi (richieste a Hugging Face sostituite): «Can't create a session. ERROR_CODE: 7, ERROR_MESSAGE: Failed to load model because protobuf parsing failed.» con la pila e la fase | ✅ |
| 4 | «Prova solo Parakeet piccolo»: una sola riga, nessuna Whisper, nessuna riga delle pause; «Avvia la prova»: Whisper + Parakeet + 3 righe delle pause | ✅ |
| 5 | a 390x664, con il banner visibile: axe pulito, nessuno scorrimento orizzontale | ✅ |

**7 prove WebKit riuscite**, sia sulla copia locale sia **sul sito pubblicato**; più le 4 prove della pagina di prima (`g3`) e **215 prove sulla logica** invariate. Prova reale di non-regressione dopo le modifiche: Parakeet piccolo (motori veri, modello scaricato) in Chromium, Edge (anche dal sito pubblicato) e WebKit: **riesce** in modo normale e a poca memoria, stesso testo (errori sulle parole 0% su 4 frasi su 5; la quinta, «9.40» invece di «nove e quaranta», conta come errore).

## Ipotesi sulla causa su Safari (NESSUNA verificata: non ho un iPhone)
1. **Memoria (la più probabile ma non provata).** L'encoder da ~190 MB viene letto da un file nella memoria del browser, scaricato come blob, copiato da onnxruntime nella memoria WebAssembly e, per un modello a 2 bit, ricomposto in pesi più grandi; Safari su iPhone può fermare una pagina o un lavoratore per mancanza di memoria **senza dire niente**. Con il diario si vedrà: se la pagina si **ricarica**, comparirà «Ultima prova interrotta a: …» con la fase e «aperta come: reload»; se si ferma solo il lavoratore, scatterà il **tempo massimo** con la fase. *Contro questa ipotesi:* Whisper base (che sul computer arriva a 1,7–2,5 GB di memoria dei processi) sullo stesso iPhone funziona, e Parakeet piccolo ne usa meno (1,4–2,1 GB).
2. **onnxruntime-web 1.31** (la libreria vuole la 1.24 o più nuova; l'app e Whisper usano la 1.22, che funziona su quell'iPhone): una versione più recente può usare funzioni WebAssembly o del linguaggio che iOS 18.7 non ha. Di solito dà un errore chiaro: ora verrebbe riportato con il messaggio completo; la sonda scrive SIMD ed eccezioni.
3. **Operatore a 2 bit (`MatMulNBits`) non supportato o troppo lento nel WebAssembly di Safari:** darebbe un errore alla creazione della sessione (ora catturato e con la fase).
4. **Caricamento come blob del file da 190 MB** (`URL.createObjectURL` → `fetch`): su Safari può essere lento o fallire senza rumore; non ho un'alternativa pronta (la libreria accetta solo indirizzi per i modelli).
5. **WebGPU presente:** la versione «con tutto» di onnxruntime-web può prepararsi anche per WebGPU; poco probabile (Whisper usa lo stesso tipo di pacchetto), ma l'unica prova è sul telefono. Per «con WebGPU si fermava alla seconda frase»: il diario dirà la fase (probabile perdita del dispositivo grafico o memoria della GPU).
6. **Whisper e Parakeet nella stessa pagina:** la memoria del lavoratore di Whisper potrebbe non essere restituita subito dal browser; è il motivo del pulsante «Prova solo Parakeet piccolo».

### Correzione provata nella pagina: modalità a poca memoria — NON confermata utile
Per Parakeet: niente ottimizzazioni del grafo (`graphOptimizationLevel: disabled`, che fanno copie dei pesi), niente «arena» di memoria di riserva (`enableCpuMemArena`, `enableMemPattern` spenti), esecuzione in sequenza, e rilascio dei collegamenti ai file scaricati appena le sessioni sono create. Casella nella pagina; **si spunta da sola dopo una prova interrotta con Parakeet**.
**Fatto:** funziona e dà lo stesso testo su Chromium, Edge e WebKit (computer). **Effetto sulla memoria:** piccolo e incoerente (memoria massima dei processi: Chromium 1409 → 1278 MB, Edge 1549 → 1772 MB, WebKit 1898 → 1824 MB; con la variabilità di questo portatile non è una differenza dimostrata). **Su iPhone non è provata.**

## Come usare la pagina sul telefono
1. Apri la pagina; premi **«Prova solo Parakeet piccolo»** (non c'è Whisper di mezzo).
2. Se la pagina si ricarica o si chiude, **riaprila**: in cima compare «Ultima prova interrotta a: …» (e la casella «poca memoria» si spunta). Premi «Copia i risultati» **anche senza rifare la prova** e incolla.
3. Riprova con «poca memoria» (già spuntata); poi «Avvia la prova» per il resto.

## Cosa NON ho potuto fare
- Riprodurre il guasto: il WebKit di Playwright su Windows esegue Parakeet piccolo senza problemi; l'iPhone vero resta l'unico banco di prova.
- Provare la modalità a poca memoria o qualunque correzione su iPhone.
- Misurare il WebGPU su iPhone.

## Le 4 righe
**FUNZIONALE — PASS ✅** — Diario, tempi massimi, cattura degli errori, pulsante nuovo e modalità a poca memoria fatti e provati in WebKit (7 prove) e con i motori veri (Chromium, Edge, WebKit); funzionano anche sul sito pubblicato.
**SICUREZZA — PASS ✅** — Il diario sta solo nella memoria locale del browser e non contiene nulla dell'utente (motore, fase, ora, errori tecnici).
**QUALITÀ — PASS ✅** — `tsc` pulito; 215 prove sulla logica; 7 prove WebKit nuove + 4 della pagina; l'app costruita da `main` non cambia (la pagina è un'altra costruzione).
**INTEGRAZIONE — PASS ✅** — Su `main` solo la pagina (`prova-parakeet/`, `src/speech/parakeet/parakeet.ts`); sul ramo `prova-parakeet` anche le prove e questo documento. Pubblicazione: commit `0dbb302`, run 42687811039, riuscito al primo tentativo.

## GATE COMPLESSIVO: PASS ✅ per gli strumenti; la causa su iPhone resta da trovare **con i dati che questa pagina ora produce**.
