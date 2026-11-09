# AUDIT_T013b — Motore offline: tempi, parametri e prova di Parakeet V3

Data: 9 novembre 2026. **Solo prova**: il motore predefinito dell'app non è cambiato e l'app pubblicata fa le stesse cose di prima.

- **Ramo `prova-parakeet`** (tutto: strumenti di misura, riquadro dei tempi, risultati, questo documento). **`main`** (commit `b9419fe`): solo ciò che serve a pubblicare la pagina di prova.
- **Indirizzo della pagina di prova per i telefoni: https://sparo111.github.io/elodict/prova-parakeet/** (nessun collegamento dall'app; verificato).

> **Come leggere questo documento.** «FATTO» = misurato qui, con i file in `prova-parakeet/risultati/` (si rilancia). «IPOTESI» = ragionamento non verificato. **Non ho provato nessun telefono vero**: tutto è su un solo computer (Windows 11, Intel Core Ultra 9 185H, 23,5 GB di RAM, scheda Intel Arc), con Chromium e Edge veri e con il WebKit di Playwright (che **non è Safari** e gira su Windows). La voce delle 5 frasi è la **sintesi vocale di Windows (Microsoft Elsa), non una persona**: i numeri sulla precisione valgono per questa voce e per 5 frasi, quindi sono indicazioni, non verdetti.

## Cosa è stato fatto

| Punto | Esito | Dove |
|---|---|---|
| A1 misura dei tempi (attesa del silenzio, preparazione audio, encoder, generazione, fino allo schermo) | **fatto** per Whisper base dentro l'app; Parakeet: preparazione/encoder/generazione nella pagina di prova | Tabelle 1, 4 |
| A2 riquadro dei tempi frase per frase, solo build di prova | **fatto**: `?perf=1` (assente nella build pubblicata: `check:dist` pulito) | `src/perf/` |
| B3 pausa `silenceMs` 400/550/700 | **fatto**, nel segmentatore e nell'app con Whisper vero | Tabelle 5, 6 |
| B4 più thread con `coi-serviceworker`, solo build di prova; PWA, aggiornamento, offline | **fatto**: 1/2/4 thread; 44 prove della PWA riuscite sulla copia con isolamento | Tabelle 1, 4 |
| B5 WebGPU in Chromium, Edge, WebKit | **fatto**: vedi sotto | Tabella 1 |
| C6–C8 Parakeet TDT 0.6B v3 con `onnx-asr-web` (due pesi, revisioni fisse) | **fatto** nella pagina di prova (non nel microfono dell'app) | `src/speech/parakeet/` |
| D9 pagina per telefoni, «Avvia la prova», «Copia i risultati», pubblicata | **fatto** | indirizzo sopra |
| D10 attribuzione CC-BY-4.0 nella pagina; pronta per Impostazioni, non mostrata | **fatto** | `src/attribution.ts` |

### Dove ho dovuto fare diversamente da come chiesto (e perché)
1. **onnxruntime-web: non si è potuto riusare quello dell'app per Parakeet.** L'app usa la 1.22 (copiata da `scripts/copy-ort.mjs`); `onnx-asr-web` e `parakeet.js` dichiarano la 1.24 o più nuova (installata: 1.31.1). Parakeet usa quindi una copia a parte (`ort24/`). Whisper nella pagina usa gli **stessi quattro file di `copy-ort`** (copiati in `ort22/`, perché con l'isolamento un lavoratore parte solo da un file che porta le intestazioni di isolamento, e le mette il service worker della pagina, che copre solo la sua cartella).
2. **Parakeet non è collegato al microfono dell'app.** La prova lo esegue sulle frasi registrate; il tempo «dalla fine della voce allo schermo» di Parakeet in un'app vera **non è misurato**: nelle raccomandazioni è una stima (attesa della pausa + tempo di calcolo misurato).
3. **Il segmentatore di T013z** è quello usato per le prove della pausa (`silenceMs`); Parakeet, nella pagina, riceve frasi già tagliate.
4. **Per l'isolamento nell'app** (build `--mode coi`, non pubblicata) non si può mettere `coi-serviceworker` accanto al service worker dell'app (due service worker sullo stesso indirizzo non possono esistere): le due intestazioni sono messe **dentro** il service worker dell'app con un piccolo file (`coi-headers.js`) che avvolge le risposte di Workbox. La pagina di prova, invece, usa il pacchetto `coi-serviceworker` vero.
5. **WebKit:** con `coi-serviceworker` il WebKit di Playwright **non riesce ad avviare i lavoratori con più thread** (errore «Returned response is null» sul file del lavoratore): su Safari/iPhone la pagina tiene perciò l'isolamento **spento di base** (`?coi=1` lo accende) e prova con 1 thread. I risultati WebKit con più thread **non esistono**.
6. **Modifiche su `main` oltre alla pagina** (da sapere): (a) `.github/workflows/deploy.yml` ha **un passo in più**, `npm run build:prova`, dopo la costruzione e il controllo dell'app; (b) `vite.config.ts`: **una riga**, l'indirizzo `prova-parakeet/` entra nell'elenco degli indirizzi per cui il service worker NON ripiega su `index.html` (senza, chi ha già usato l'app vedrebbe l'app al posto della pagina). **Confronto della costruzione dell'app prima/dopo: tutti i file identici, tranne `sw.js`, che cambia solo di quella riga**; chi ha l'app installata vedrà una volta l'avviso «È pronta una nuova versione». (c) due dipendenze di sviluppo (`onnx-asr-web`, `coi-serviceworker`): non entrano nell'app. Il sito pubblicato pesa circa 81 MB in più (ort22 32 MB, ort24 43 MB, audio 5 MB).

## Riassunto dei fatti (da leggere prima delle tabelle)

**Tempi di Whisper base nell'app (Tabella 4, 1 thread):** dalla fine della voce al testo sullo schermo passano **≈ 3,8 s**: pausa che chiude la frase 0,7 s (19%), **encoder 1,9 s (50%)**, generazione del testo 1,0 s (28%), spettro log-mel 0,12 s, tutto il resto (preparazione, coda, ritorno, schermo) meno di 0,03 s. L'encoder di Whisper costa circa lo stesso per una frase da 3 s e per una da 14 s (lavora su finestre fisse da 30 s): ecco perché le frasi brevi non sono veloci.

**Thread (Tabelle 1 e 4):** Whisper base 1 → 2 → 4 thread: in pagina 3,0 → 2,1 → 1,5 s a frase; nell'app (totale) 3,8 → 2,8 → 2,2 s. Parakeet int8: 1,7 → 1,0 → 0,6 s. Parakeet w2a8: 3,6 → 2,0 → 1,15 s. **L'isolamento (SharedArrayBuffer) non ha rotto la PWA**: 44 prove su 44 riuscite sulla copia `coi` (installazione, uso senza internet, nuova versione, icone). Rischio non provato: iPhone/Safari (vedi punto 5).

**Pausa `silenceMs` (Tabelle 5 e 6):** con l'audio che ha 6 pause dentro la frase (350–800 ms): **400 ms → 6 frasi tagliate a metà su 6**, **550 → 3–4**, **700 → 1**, 900 → 0. Il ritardo cresce quasi uno a uno con il valore (426 / 586 / 725 ms nel segmentatore). Le frasi tagliate a metà peggiorano il **testo**, non solo il numero di frasi: con 400 Whisper scrive «Per favore. ¦ chiudi la finestra della cucina.» e «Volei un caffè. ¦ senza zucchero» (maiuscola e punto in mezzo alla frase; parole storpiate), con 700 la frase resta intera.

**Parakeet contro Whisper (Tabelle 1 e 3, stesse 5 frasi):** WER Whisper base **8,9%**, Parakeet w2a8 **5,1%**, Parakeet int8 **3,8%**; punteggiatura attesa trovata: Whisper 92%, Parakeet int8 85%, w2a8 77%. Parakeet sbaglia solo la frase 4, e **per le cifre**: scrive «alle 9.40 … binario 7» dove la frase giusta ha «nove e quaranta … sette» (è una scelta di scrittura, non un errore di ascolto); Whisper sbaglia parole in 4 frasi su 5 («piuve», «camerai regentile», «quarenta», «billeti», «entre», «desiderà»). Con 5 frasi e una voce sola la differenza tra int8 (3,8%) e w2a8 (5,1%) **non è significativa**.

**Scarico e memoria (Tabella 1):** Whisper base ≈ 76–79 MB (+ 21 MB di motore); Parakeet w2a8 **199 MiB** (≈ 208 MB, 190 MB di encoder a 2 bit); Parakeet int8 **640 MiB** (≈ 670 MB). **Memoria massima dei processi del browser** (somma della memoria dei processi, dal sistema operativo; il browser vuoto ne usa ≈ 300 MB): Whisper 1,7–2,5 GB (WebKit 2,4–4,5 GB), w2a8 1,4–2,1 GB, int8 2,6–3,3 GB. In un telefono questi numeri **possono non starci** (IPOTESI: non provato).

**WebGPU (Tabella 1):** Chromium di Playwright: l'interfaccia c'è ma **nessun adattatore** (anche con le opzioni); **Edge**: adattatore Intel Arc (xe-lpg), **funziona**; WebKit di Playwright su Windows: **no**. In Edge con Whisper base (encoder fp32, decoder q4; 217 MB di pesi) l'encoder scende da 1,8 s a 0,55 s ma la generazione **sale** da 1,0 a 1,7 s: in tutto 2,4 s a frase, **peggio** di 4 thread su CPU (1,5 s) e solo poco meglio di 1 thread (3,0 s), con 4,8 GB di memoria. **Parakeet su WebGPU in Edge: la prova «riesce» ma il testo è vuoto con tutti e due i pesi** (WER 100%): non utilizzabile così. (L'autore del modello a 2 bit dice che funziona solo su CPU.)

**Nell'app, Edge e Chromium danno lo stesso risultato** (Tabella 4: 3,76 e 3,78 s con 1 thread). Una prova con 4 thread su Edge ha chiuso solo 4 frasi su 5 (la quinta non è arrivata entro 150 s; causa non indagata: non l'ho ripetuta).

## Raccomandazioni

> Valgono per **questo** computer. Per iPhone e Android sono **IPOTESI da confermare con la pagina di prova sul telefono vero**: finché non ci sono i risultati, non cambierei il motore predefinito di nessuno.

| Dove | Motore e pesi (ipotesi/raccomandazione) | Perché (fatti) | Cosa resta incerto |
|---|---|---|---|
| **Computer** (Windows/Mac, ≥ 8 GB) | **Parakeet int8, 4 thread** come scelta «veloce e precisa» facoltativa; **w2a8** come via di mezzo (208 MB); **Whisper base resta il predefinito e il ripiego** | int8: 0,6 s a frase (RTF 0,08) e WER 3,8% contro 1,5 s e 8,9% di Whisper a 4 thread; ma 670 MB da scaricare e ≈ 3 GB di memoria | tempo vero «voce → schermo» con Parakeet nell'app (stima: 0,7 s di pausa + ≈ 0,7 s ≈ 1,4 s contro 2,2 s di Whisper a 4 thread); cifre scritte come numeri; Mac non provato |
| **Android** | IPOTESI: **w2a8** se la RAM è ≥ 6 GB, altrimenti Whisper base; 2–4 thread | w2a8 è il più leggero dei due Parakeet (208 MB) e 1,15 s a frase a 4 thread qui | memoria e velocità sul telefono: nessun dato |
| **iPhone** | IPOTESI: **Whisper base** finché non si misura; w2a8 solo se la pagina di prova lo regge; **int8 escluso** | 640 MiB di scarico e ≈ 3 GB di memoria non sono credibili su Safari; anche w2a8 ha toccato 1,4–2,1 GB | tutto: nessun iPhone provato; Safari non ha dato il via ai thread nella prova WebKit |
| **`silenceMs`** | **tenere 700 ms** | 400 e 550 tagliano a metà 3–6 pause naturali su 6 e rovinano il testo; 700 ne taglia 1 (quella da 800 ms); il guadagno di 150–300 ms è piccolo rispetto ai 2–4 s totali | le pause sono sintetiche (350–800 ms); con persone vere e con un motore più veloce (Parakeet) conviene rimisurare, magari con una pausa che si adatta |
| **Thread** | **4 thread (o metà dei core, al massimo 4) dove c'è l'isolamento; 1 thread altrimenti** | −42% sul tempo totale nell'app (3,8 → 2,2 s); PWA, uso senza internet e aggiornamento non si rompono | iPhone/Safari: i thread non sono partiti nella prova; su Android non provato; l'isolamento blocca risorse di altri siti senza permesso esplicito (oggi l'app non ne usa) |
| **WebGPU** | **non usarlo ora** | Whisper non va meglio di 4 thread su CPU e usa 4,8 GB; Parakeet dà testo vuoto | altre schede video e altri browser non provati |

## Cosa NON ho potuto verificare
- **Telefoni veri** (iPhone, Android): nessuno. La pagina è pronta per provarli: https://sparo111.github.io/elodict/prova-parakeet/ → «Avvia la prova» → «Copia i risultati» e incollare.
- **Voce umana** e microfoni veri; **Parakeet nel microfono dell'app**; **WebKit con più thread**; **Mac e Linux**; **il browser Safari vero** (il WebKit di Playwright su Windows ha tempi simili a Chromium ma non è Safari).
- La **memoria massima** è la memoria dei processi vista dal sistema operativo (anche il browser stesso), non quella della sola pagina (`measureUserAgentSpecificMemory` non rispondeva in modalità senza finestra).
- Le **cifre**: il confronto del testo non normalizza «9.40» contro «nove e quaranta»: conta come errore (vedi sopra).
- Una misura su Edge pubblicata (sito vero, Tabella «pubblicata», `pubblicata-msedge.json`) ha dato per Whisper gli stessi tempi di prima e per Parakeet w2a8 tempi **più alti la prima volta** (4,3 s a frase con 1 thread contro 2,3 s): variazione tra una prova e l'altra su un portatile (non indagata); le tabelle sotto usano le prove locali.

## Le 4 righe
**FUNZIONALE — PASS ✅** — Misure, regolazione della pausa, thread, WebGPU e Parakeet fatti e riproducibili; pagina pubblicata e provata sul sito vero (4 prove: pulsante grande a 390 px, crediti, tabella e «Copia i risultati», nessun collegamento dall'app, apertura anche con il service worker dell'app installato).
**SICUREZZA — PASS ✅ (con note)** — I pesi vengono da Hugging Face a revisione fissa (hash del commit); nessun dato dell'utente esce; l'isolamento cross-origin resta solo nella build di prova e nella pagina di prova. Nota: la pagina scarica fino a ≈ 880 MB se si spunta «modello grande».
**QUALITÀ — PASS ✅** — 215 prove sulla logica (nuove: pesi con revisioni da 40 caratteri, crediti in 4 lingue, confronto del testo, pausa); 513 prove nel browser invariate e riuscite sul ramo; 44 prove della PWA sulla copia con isolamento. L'app costruita da `main` è identica a prima tranne la riga del service worker.
**INTEGRAZIONE — PASS ✅** — Il flusso di pubblicazione ha un passo in più e l'app resta quella di prima; il motore predefinito non è cambiato; crediti CC-BY-4.0 pronti per Impostazioni ma non mostrati.

## GATE COMPLESSIVO: PASS ✅ per la prova; le raccomandazioni per telefoni restano ipotesi fino ai risultati sul telefono.

---

# Tabelle (generate da `scripts/prova-riassunto.mjs` dai file di `prova-parakeet/risultati/`)

Legenda: RTF = tempo di calcolo / durata dell'audio (più basso è meglio); WER = errori sulle parole senza punteggiatura né maiuscole; «A freddo» = prima trascrizione dopo il caricamento; «Memoria max (SO)» = memoria dei processi del browser (≈ 300 MB a vuoto).

### Tabella 1 — pagina di prova: tempi, memoria, scarico, precisione (5 frasi italiane, voce di sintesi)

| Browser | Motore · pesi | Thread | Backend | MB scaricati | Caricamento s | Memoria max (SO) MB | A freddo ms | Tempo medio ms | RTF | Encoder ms (medio) | Generazione ms (medio) | WER % | Punteggiatura % | Esito |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chromium | whisper-base | 1 | wasm | 76 | 8.3 | 1830 | 2654 | 2970 | 0.39 | 1809 | 1034 | 8.9 | 92.3 | ok |
| chromium | whisper-base | 2 | wasm | 76 | 1.0 | 1751 | 1775 | 2083 | 0.27 | 1111 | 844 | 8.9 | 92.3 | ok |
| chromium | whisper-base | 4 | wasm | 76 | 0.7 | 1971 | 1149 | 1509 | 0.20 | 652 | 728 | 8.9 | 92.3 | ok |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 199 | 15.5 | 1740 | 2347 | 3605 | 0.47 | 3511 | 81 | 5.1 | 76.9 | ok |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 199 | 1.6 | 1468 | 1354 | 2081 | 0.27 | 2013 | 58 | 5.1 | 76.9 | ok |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 199 | 1.1 | 1370 | 651 | 1161 | 0.15 | 1111 | 40 | 5.1 | 76.9 | ok |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 640 | 42.8 | 2564 | 999 | 1726 | 0.23 | 1645 | 70 | 3.8 | 84.6 | ok |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 640 | 3.2 | 2682 | 603 | 1050 | 0.14 | 989 | 48 | 3.8 | 84.6 | ok |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 640 | 2.7 | 2829 | 306 | 588 | 0.08 | 543 | 34 | 3.8 | 84.6 | ok |
| msedge | whisper-base | 1 | wasm | 79 | 6.3 | 2188 | 2709 | 2981 | 0.39 | 1843 | 1014 | 8.9 | 92.3 | ok |
| msedge | whisper-base | 2 | wasm | 79 | 1.0 | 2133 | 1858 | 2045 | 0.27 | 1090 | 831 | 8.9 | 92.3 | ok |
| msedge | whisper-base | 4 | wasm | 79 | 1.0 | 2503 | 1383 | 1587 | 0.21 | 730 | 729 | 8.9 | 92.3 | ok |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 199 | 16.0 | 1599 | 2281 | 3602 | 0.47 | 3506 | 84 | 5.1 | 76.9 | ok |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 199 | 1.6 | 1635 | 1315 | 2002 | 0.26 | 1935 | 56 | 5.1 | 76.9 | ok |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 199 | 1.2 | 2100 | 624 | 1143 | 0.15 | 1087 | 45 | 5.1 | 76.9 | ok |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 640 | 43.8 | 2893 | 981 | 1768 | 0.23 | 1682 | 74 | 3.8 | 84.6 | ok |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 640 | 3.2 | 3129 | 599 | 1034 | 0.14 | 972 | 51 | 3.8 | 84.6 | ok |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 640 | 3.1 | 3013 | 477 | 617 | 0.08 | 573 | 32 | 3.8 | 84.6 | ok |
| msedge | whisper-base | 1 | webgpu | 217 | 13.7 | 4816 | 3647 | 2370 | 0.31 | 555 | 1670 | 6.3 | 92.3 | ok |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 0 | 1.7 | 2979 | 3054 | 2368 | 0.31 | 1093 | 1220 | 100.0 | 0.0 | ok |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 0 | 3.6 | 3714 | 3287 | 5030 | 0.66 | 2351 | 2659 | 100.0 | 0.0 | ok |
| webkit + coi-serviceworker | whisper-base | 1 | wasm | 99 | 6.2 | 4468 | 2809 | 3021 | 0.40 | 1832 | 1003 | 8.9 | 92.3 | ok |
| webkit + coi-serviceworker | whisper-base | 2 | wasm | 99 | 0.0 | 536 | n/d | — | — | — | — | — | — | Error: errore del lavoratore |
| webkit (senza isolamento) | whisper-base | 1 | wasm | 99 | 6.3 | 2409 | 2769 | 3038 | 0.40 | 1848 | 999 | 8.9 | 92.3 | ok |
| webkit (senza isolamento) | parakeet-olicorne-w2a8 | 1 | wasm | 199 | 18.1 | 1845 | 2439 | 3790 | 0.50 | 3657 | 121 | 5.1 | 76.9 | ok |
| webkit (senza isolamento) | parakeet-istupakov-int8 | 1 | wasm | 640 | 50.6 | 3305 | 1004 | 1853 | 0.24 | 1736 | 105 | 3.8 | 84.6 | ok |

### Tabella 2 — per frase (ms), configurazioni riuscite

| Browser | Motore | Thread | Backend | Frase | Audio s | Preparazione | Encoder | Generazione | Totale |
|---|---|---|---|---|---|---|---|---|---|
| chromium | whisper-base | 1 | wasm | 1 | 4.1 | 116 | 1814 | 554 | 2498 |
| chromium | whisper-base | 1 | wasm | 2 | 3.6 | 111 | 1862 | 539 | 2525 |
| chromium | whisper-base | 1 | wasm | 3 | 8.4 | 115 | 1785 | 1101 | 3019 |
| chromium | whisper-base | 1 | wasm | 4 | 7.9 | 106 | 1799 | 1100 | 3017 |
| chromium | whisper-base | 1 | wasm | 5 | 14.2 | 106 | 1784 | 1874 | 3790 |
| chromium | whisper-base | 2 | wasm | 1 | 4.1 | 115 | 1113 | 440 | 1682 |
| chromium | whisper-base | 2 | wasm | 2 | 3.6 | 107 | 1114 | 432 | 1665 |
| chromium | whisper-base | 2 | wasm | 3 | 8.4 | 115 | 1115 | 921 | 2169 |
| chromium | whisper-base | 2 | wasm | 4 | 7.9 | 107 | 1109 | 890 | 2123 |
| chromium | whisper-base | 2 | wasm | 5 | 14.2 | 104 | 1106 | 1537 | 2773 |
| chromium | whisper-base | 4 | wasm | 1 | 4.1 | 120 | 655 | 364 | 1151 |
| chromium | whisper-base | 4 | wasm | 2 | 3.6 | 109 | 639 | 375 | 1135 |
| chromium | whisper-base | 4 | wasm | 3 | 8.4 | 125 | 650 | 778 | 1571 |
| chromium | whisper-base | 4 | wasm | 4 | 7.9 | 101 | 658 | 780 | 1556 |
| chromium | whisper-base | 4 | wasm | 5 | 14.2 | 105 | 659 | 1342 | 2132 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 1 | 4.1 | 6 | 2302 | 47 | 2355 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 2 | 3.6 | 6 | 2080 | 43 | 2130 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 3 | 8.4 | 13 | 3795 | 94 | 3902 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 4 | 7.9 | 14 | 3547 | 84 | 3646 |
| chromium | parakeet-olicorne-w2a8 | 1 | wasm | 5 | 14.2 | 19 | 5832 | 138 | 5990 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 1 | 4.1 | 6 | 1307 | 31 | 1344 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 2 | 3.6 | 7 | 1196 | 28 | 1232 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 3 | 8.4 | 10 | 2198 | 62 | 2271 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 4 | 7.9 | 12 | 2062 | 60 | 2135 |
| chromium | parakeet-olicorne-w2a8 | 2 | wasm | 5 | 14.2 | 18 | 3299 | 108 | 3425 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 1 | 4.1 | 5 | 695 | 21 | 722 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 2 | 3.6 | 5 | 624 | 19 | 649 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 3 | 8.4 | 10 | 1160 | 54 | 1224 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 4 | 7.9 | 11 | 1235 | 37 | 1283 |
| chromium | parakeet-olicorne-w2a8 | 4 | wasm | 5 | 14.2 | 17 | 1842 | 67 | 1926 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 1 | 4.1 | 8 | 945 | 37 | 991 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 2 | 3.6 | 5 | 797 | 29 | 831 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 3 | 8.4 | 12 | 1786 | 72 | 1870 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 4 | 7.9 | 11 | 1687 | 72 | 1770 |
| chromium | parakeet-istupakov-int8 | 1 | wasm | 5 | 14.2 | 18 | 3009 | 138 | 3165 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 1 | 4.1 | 6 | 595 | 21 | 624 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 2 | 3.6 | 5 | 492 | 24 | 520 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 3 | 8.4 | 11 | 1061 | 49 | 1122 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 4 | 7.9 | 11 | 1017 | 51 | 1079 |
| chromium | parakeet-istupakov-int8 | 2 | wasm | 5 | 14.2 | 29 | 1779 | 97 | 1905 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 1 | 4.1 | 6 | 301 | 16 | 325 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 2 | 3.6 | 5 | 276 | 14 | 297 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 3 | 8.4 | 12 | 608 | 36 | 656 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 4 | 7.9 | 12 | 548 | 33 | 594 |
| chromium | parakeet-istupakov-int8 | 4 | wasm | 5 | 14.2 | 18 | 980 | 69 | 1067 |
| msedge | whisper-base | 1 | wasm | 1 | 4.1 | 118 | 1838 | 547 | 2518 |
| msedge | whisper-base | 1 | wasm | 2 | 3.6 | 106 | 1882 | 537 | 2531 |
| msedge | whisper-base | 1 | wasm | 3 | 8.4 | 108 | 1850 | 1078 | 3053 |
| msedge | whisper-base | 1 | wasm | 4 | 7.9 | 106 | 1812 | 1067 | 3000 |
| msedge | whisper-base | 1 | wasm | 5 | 14.2 | 103 | 1834 | 1843 | 3804 |
| msedge | whisper-base | 2 | wasm | 1 | 4.1 | 128 | 1098 | 432 | 1670 |
| msedge | whisper-base | 2 | wasm | 2 | 3.6 | 107 | 1077 | 422 | 1613 |
| msedge | whisper-base | 2 | wasm | 3 | 8.4 | 102 | 1099 | 901 | 2122 |
| msedge | whisper-base | 2 | wasm | 4 | 7.9 | 102 | 1088 | 878 | 2082 |
| msedge | whisper-base | 2 | wasm | 5 | 14.2 | 104 | 1088 | 1521 | 2738 |
| msedge | whisper-base | 4 | wasm | 1 | 4.1 | 122 | 615 | 366 | 1115 |
| msedge | whisper-base | 4 | wasm | 2 | 3.6 | 114 | 643 | 353 | 1117 |
| msedge | whisper-base | 4 | wasm | 3 | 8.4 | 104 | 777 | 804 | 1703 |
| msedge | whisper-base | 4 | wasm | 4 | 7.9 | 117 | 806 | 768 | 1703 |
| msedge | whisper-base | 4 | wasm | 5 | 14.2 | 107 | 811 | 1356 | 2297 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 1 | 4.1 | 6 | 2268 | 45 | 2320 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 2 | 3.6 | 8 | 2092 | 42 | 2143 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 3 | 8.4 | 12 | 3744 | 101 | 3858 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 4 | 7.9 | 14 | 3518 | 81 | 3614 |
| msedge | parakeet-olicorne-w2a8 | 1 | wasm | 5 | 14.2 | 18 | 5906 | 150 | 6075 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 1 | 4.1 | 6 | 1246 | 32 | 1284 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 2 | 3.6 | 5 | 1151 | 29 | 1186 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 3 | 8.4 | 13 | 2101 | 65 | 2179 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 4 | 7.9 | 12 | 1959 | 59 | 2031 |
| msedge | parakeet-olicorne-w2a8 | 2 | wasm | 5 | 14.2 | 21 | 3216 | 93 | 3332 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 1 | 4.1 | 6 | 769 | 24 | 799 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 2 | 3.6 | 5 | 612 | 21 | 639 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 3 | 8.4 | 10 | 1154 | 51 | 1217 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 4 | 7.9 | 11 | 1060 | 44 | 1115 |
| msedge | parakeet-olicorne-w2a8 | 4 | wasm | 5 | 14.2 | 19 | 1837 | 88 | 1945 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 1 | 4.1 | 7 | 992 | 38 | 1038 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 2 | 3.6 | 8 | 798 | 29 | 835 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 3 | 8.4 | 13 | 1818 | 77 | 1908 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 4 | 7.9 | 13 | 1756 | 78 | 1848 |
| msedge | parakeet-istupakov-int8 | 1 | wasm | 5 | 14.2 | 21 | 3046 | 146 | 3213 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 1 | 4.1 | 7 | 591 | 38 | 636 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 2 | 3.6 | 5 | 481 | 22 | 508 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 3 | 8.4 | 11 | 1058 | 53 | 1122 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 4 | 7.9 | 12 | 989 | 55 | 1056 |
| msedge | parakeet-istupakov-int8 | 2 | wasm | 5 | 14.2 | 17 | 1741 | 89 | 1848 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 1 | 4.1 | 7 | 365 | 24 | 396 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 2 | 3.6 | 9 | 422 | 15 | 446 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 3 | 8.4 | 12 | 576 | 35 | 624 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 4 | 7.9 | 11 | 542 | 34 | 588 |
| msedge | parakeet-istupakov-int8 | 4 | wasm | 5 | 14.2 | 17 | 960 | 54 | 1031 |
| msedge | whisper-base | 1 | webgpu | 1 | 4.1 | 141 | 584 | 880 | 1618 |
| msedge | whisper-base | 1 | webgpu | 2 | 3.6 | 131 | 536 | 799 | 1477 |
| msedge | whisper-base | 1 | webgpu | 3 | 8.4 | 120 | 535 | 1853 | 2527 |
| msedge | whisper-base | 1 | webgpu | 4 | 7.9 | 117 | 563 | 1701 | 2397 |
| msedge | whisper-base | 1 | webgpu | 5 | 14.2 | 128 | 557 | 3117 | 3831 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 1 | 4.1 | 173 | 725 | 623 | 1524 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 2 | 3.6 | 11 | 467 | 604 | 1083 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 3 | 8.4 | 19 | 1083 | 1362 | 2465 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 4 | 7.9 | 19 | 924 | 1228 | 2172 |
| msedge | parakeet-olicorne-w2a8 | 1 | webgpu | 5 | 14.2 | 47 | 2267 | 2280 | 4595 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 1 | 4.1 | 16 | 1618 | 1527 | 3165 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 2 | 3.6 | 12 | 1471 | 1262 | 2746 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 3 | 8.4 | 20 | 2537 | 3145 | 5705 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 4 | 7.9 | 18 | 2441 | 2720 | 5180 |
| msedge | parakeet-istupakov-int8 | 1 | webgpu | 5 | 14.2 | 24 | 3690 | 4639 | 8355 |
| webkit | whisper-base | 1 | wasm | 1 | 4.1 | 176 | 1807 | 537 | 2528 |
| webkit | whisper-base | 1 | wasm | 2 | 3.6 | 174 | 1864 | 540 | 2585 |
| webkit | whisper-base | 1 | wasm | 3 | 8.4 | 172 | 1882 | 1087 | 3156 |
| webkit | whisper-base | 1 | wasm | 4 | 7.9 | 175 | 1853 | 1080 | 3122 |
| webkit | whisper-base | 1 | wasm | 5 | 14.2 | 167 | 1752 | 1772 | 3712 |
| webkit | whisper-base | 1 | wasm | 1 | 4.1 | 182 | 1813 | 533 | 2536 |
| webkit | whisper-base | 1 | wasm | 2 | 3.6 | 187 | 1910 | 535 | 2639 |
| webkit | whisper-base | 1 | wasm | 3 | 8.4 | 178 | 1866 | 1063 | 3118 |
| webkit | whisper-base | 1 | wasm | 4 | 7.9 | 172 | 1816 | 1085 | 3095 |
| webkit | whisper-base | 1 | wasm | 5 | 14.2 | 169 | 1836 | 1778 | 3804 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 1 | 4.1 | 6 | 2464 | 70 | 2540 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 2 | 3.6 | 5 | 2176 | 65 | 2246 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 3 | 8.4 | 11 | 3925 | 134 | 4071 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 4 | 7.9 | 13 | 3705 | 128 | 3847 |
| webkit | parakeet-olicorne-w2a8 | 1 | wasm | 5 | 14.2 | 22 | 6017 | 206 | 6246 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 1 | 4.1 | 11 | 1031 | 56 | 1101 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 2 | 3.6 | 5 | 848 | 49 | 904 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 3 | 8.4 | 11 | 1900 | 134 | 2046 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 4 | 7.9 | 10 | 1761 | 107 | 1878 |
| webkit | parakeet-istupakov-int8 | 1 | wasm | 5 | 14.2 | 19 | 3140 | 177 | 3336 |

### Tabella 3 — testo prodotto (primo browser che ha finito la configurazione, 1 thread)

| Motore · pesi | Frase | Testo riconosciuto | WER % |
|---|---|---|---|
| whisper-base | 1 | Buongiorno, vorrei prenotare un tavolo. | 0.0 |
| whisper-base | 2 | Domani piuve, porta l'ombrello. | 25.0 |
| whisper-base | 3 | Ieri sera abbiamo cenato in un ristorante vicino al mare, e il camerai regentile ci ha consigliato il pesce fresco. | 10.0 |
| whisper-base | 4 | Il treno per Roma parte alle nove e quarenta dal binario sette, non dimenticare i billeti e il passaporto. | 10.5 |
| whisper-base | 5 | Gentile cliente, la informiamo che il suo ordine è stato spedito questa mattina e arriverà entre tre giorni lavorativi, se desiderà cambiare l'indirizzo di consegna, ci contatti al più presto, grazie. | 6.5 |
| parakeet-olicorne-w2a8 | 1 | Buongiorno, vorrei prenotare un tavolo | 0.0 |
| parakeet-olicorne-w2a8 | 2 | Domani piove, porta l'ombrello | 0.0 |
| parakeet-olicorne-w2a8 | 3 | Ieri sera abbiamo cenato in un ristorante vicino al mare, e il cameriere gentile ci ha consigliato il pesce fresco. | 0.0 |
| parakeet-olicorne-w2a8 | 4 | Il treno per Roma parte alle 9.40 dal binario 7, non dimenticare i biglietti e il passaporto. | 21.1 |
| parakeet-olicorne-w2a8 | 5 | Gentile cliente, la informiamo che il suo ordine è stato spedito questa mattina e arriverà entro tre giorni lavorativi, se desidera cambiare l'indirizzo di consegna, ci contatti al più presto, grazie. | 0.0 |
| parakeet-istupakov-int8 | 1 | Buongiorno, vorrei prenotare un tavolo. | 0.0 |
| parakeet-istupakov-int8 | 2 | Domani piove, porta l'ombrello. | 0.0 |
| parakeet-istupakov-int8 | 3 | Ieri sera abbiamo cenato in un ristorante vicino al mare, e il cameriere Gentile ci ha consigliato il pesce fresco. | 0.0 |
| parakeet-istupakov-int8 | 4 | Il treno per Roma parte alle 9 e 40 dal binario 7. Non dimenticare i biglietti e il passaporto. | 15.8 |
| parakeet-istupakov-int8 | 5 | Gentile cliente, la informiamo che il suo ordine è stato spedito questa mattina e arriverà entro tre giorni lavorativi. Se desidera cambiare l'indirizzo di consegna, ci contatti al più presto, grazie. | 0.0 |

### Dispositivi e browser provati

- **chromium**: userAgent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/158.0.8127.18 Safari/537.36 · platform=Windows · cores=22 · deviceMemoryGB=16 · crossOriginIsolated=true · sharedArrayBuffer=true · webgpu=true · platformVersion=19.0.0 · architecture=x86 · webgpuAdapter=nessun adattatore
- **msedge**: userAgent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36 Edg/153.0.0.0 · platform=Windows · cores=22 · deviceMemoryGB=16 · crossOriginIsolated=true · sharedArrayBuffer=true · webgpu=true · platformVersion=19.0.0 · architecture=x86 · webgpuAdapter=intel / xe-lpg
- **webkit**: userAgent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15 · platform=Win32 · cores=8 · crossOriginIsolated=true · sharedArrayBuffer=true · webgpu=false
- **webkit**: userAgent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15 · platform=Win32 · cores=8 · crossOriginIsolated=false · sharedArrayBuffer=false · webgpu=false

### Tabella 6 — pausa che chiude la frase, solo il segmentatore (audio con 6 pause interne: 350, 450, 500, 600, 650, 800 ms)

| silenceMs | Frasi emesse / volute | Tagliate a metà | Ritardo medio ms |
|---|---|---|---|
| 400 | 12 / 6 | 6 | 426 |
| 550 | 9 / 6 | 3 | 586 |
| 700 | 7 / 6 | 1 | 725 |

### Tabella 4 — dentro l'app (build di prova, Whisper base, microfono finto con le 5 frasi di fila): dove va il tempo, in ms

| Prova | Frasi | Isolata | Attesa pausa | Preparazione | Coda | Log-mel | Encoder | Generazione | Ritorno | Schermo | **Totale (fine voce → schermo)** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| app-chromium-base-r1 | 5 | true | 724 | 6 | 0 | 122 | 1894 | 1048 | 0 | 4 | **3811** |
| app-chromium-base-r2 | 5 | true | 686 | 7 | 0 | 119 | 1867 | 1043 | 0 | 9 | **3743** |
| app-chromium-threads2 | 5 | true | 688 | 6 | 0 | 117 | 1124 | 848 | 0 | 11 | **2806** |
| app-chromium-threads4 | 5 | true | 632 | 6 | 0 | 120 | 645 | 731 | 0 | 14 | **2161** |
| app-chromium-webgpu | 0 | true | — | — | — | — | — | — | — | — | TimeoutError: locator.waitFor: Timeout 240000ms exceeded.
Call log:
[2m  - waiting for getByText('Ti ascolto…') to be visible[22m
 |
| app-msedge-base | 5 | true | 632 | 6 | 0 | 134 | 1922 | 1042 | 0 | 7 | **3756** |
| app-msedge-threads4 | 4 | true | 720 | 4 | 0 | 135 | 696 | 589 | 0 | 15 | **2171** |

### Tabella 5 — pausa che chiude la frase (silenceMs) nell'app, con Whisper vero (audio con 6 pause interne di 350–800 ms)

| silenceMs | Frasi in uscita (6 volute) | Tagliate a metà | Attesa pausa media ms | Totale medio ms | Testo in uscita (una frase per ¦) |
|---|---|---|---|---|---|
| 400 | 12 | 6 | 355 | 5801 | Per favore. ¦ chiudi la finestra della cucina. ¦ Do manima tina ¦ devo portare la macchina dal meccanico. ¦ Volei un caffè. ¦ senza zucchero ¦ Mi assurella arriva al 16. ¦ con i bambini ¦ Il libro che mi ha prestato. ¦ è davvero bellissimo! ¦ Telefon ammistacera ¦ dopodina |
| 550 | 10 | 4 | 502 | 3210 | Per favore, chiudi la finestra della cucina. ¦ Domani mattina, devo portare la macchina dal mecanico. ¦ Volei un caffè ¦ senza zupiro. ¦ Mi assurella arriva al le 6. ¦ con i bambini. ¦ il libro che mi ha prestato ¦ è davvero bellissimo! ¦ Telefon amista sera ¦ no, potevete. |
| 700 | 7 | 1 | 703 | 3294 | Per favore, chiudi la finestra della cucina. ¦ Domani mattina, devo portare la macchina dal mecanico. ¦ vorrei un caffè senza zucchero ¦ Mi assorella arriva alle 6 con i bambini. ¦ il libro che mi hai prestato è davvero bellissimo ¦ Telefon amista sera ¦ dopodina. |

