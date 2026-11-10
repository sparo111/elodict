# AUDIT_T013d — «Privato preciso» (Parakeet piccolo) come scelta in più nell'app

Data: 10 novembre 2026. **Il motore di partenza per i nuovi utenti non cambia**: resta «Il browser» (verificato da una prova: con impostazioni nuove la scelta selezionata è il browser). Primo avvio guidato invariato (offre solo «Il browser» e «Privato» con Whisper).

## Cosa c'è di nuovo (punti 1–9)

| Punto | Fatto |
|---|---|
| 1 Impostazioni → «Chi ascolta la tua voce»: nuova scelta «Privato preciso» (it/en/fr/es) con la riga «Più preciso del Privato con Whisper. Circa 200 MB da scaricare una volta. Funziona senza internet e l'audio non lascia il tuo dispositivo.» | ✅ le due scelte di prima sono identiche; con «Privato preciso» al posto del menu del modello di Whisper c'è il suo scarico (stessi pulsanti e stessi messaggi di Whisper) |
| 2 Olicorne/parakeet-tdt-0.6b-v3-redux-onnx (w2a8), revisione fissata, 1 thread, WASM, niente WebGPU | ✅ revisione `de66c10f18f6d94cb3e910e48034e45ce51109bc` (40 caratteri; una prova controlla che nessun indirizzo usi «main»); `numThreads: 1`, `executionProviders: ["wasm"]` |
| 3 Un solo modello in memoria alla volta | ✅ `createEngine` chiude il lavoratore dell'altro motore (e di tutti e due se si sceglie «Il browser»); il modello scaricato resta nella memoria del browser e si ricarica quando serve |
| 4 Stesso segmentatore (700 ms, correzione di T013z), stesso microfono scelto, stessi comandi vocali | ✅ il ciclo microfono → pause → riconoscitore è **lo stesso codice** (`createMicEngine`, estratto da quello di Whisper); i comandi passano dallo stesso `applyTranscript` |
| 5 Pulizia del testo: punto se manca; nessuna parola cambiata; cifre restano cifre | ✅ `cleanParakeetText` (aggiunge «.» solo se la frase finisce con una lettera o una cifra; toglie spazi doppi; niente da scrivere se non ci sono lettere né cifre) |
| 6 Lingua riconosciuta da sola | ✅ verificata per it/en, vedi sotto i **rischi** |
| 7 onnxruntime: due versioni | ✅ **due copie separate** (spiegato sotto) |
| 8 Avanzamento, uso senza internet, «Elimina i modelli scaricati» toglie anche Parakeet | ✅ |
| 9 Crediti CC-BY-4.0 in Impostazioni (da `src/attribution.ts`) | ✅ visibili in Impostazioni (nella lingua dell'interfaccia) quando Parakeet è disponibile, cioè quando il browser può eseguire il riconoscimento offline |

## Punto 7 — onnxruntime: due copie separate (e perché)
**Fatto:** `@huggingface/transformers` (Whisper) fissa onnxruntime-web **1.22**; `onnx-asr-web` (Parakeet) richiede la **1.24 o più nuova** (installata: 1.31.1). npm le tiene separate (la 1.31 è dentro `node_modules/onnx-asr-web/`).
**Scelta:** **due copie**, `public/ort` (1.22, Whisper) e `public/ort31` (1.31, Parakeet), copiate da `scripts/copy-ort.mjs`; ognuno dei due lavoratori punta alla sua cartella.
**Perché è la più semplice e sicura:** non cambia niente di Whisper (stesso codice, stessi file, stesse prove). Una versione sola avrebbe voluto aggiornare Whisper alla 1.31 (forzando una dipendenza fissata dalla sua libreria) o portare Parakeet alla 1.22 (la libreria lo vieta, e l'encoder a 2 bit potrebbe non andare): in tutti e due i casi si rischia di rompere ciò che oggi funziona su iPhone. **Non ho provato** né Whisper con la 1.31 né Parakeet con la 1.22.
**Costo:** +44 MB di file nel sito (`ort31/`), **non** nella copia iniziale della PWA (i `.wasm`/`.mjs` e `ort31/**` sono esclusi, come `ort/`) e scaricati solo quando si sceglie «Privato preciso»; +465 KB di codice del lavoratore, caricato solo allora. Un secondo `.wasm` identico che Vite avrebbe aggiunto da solo (30 MB) è tolto dalla costruzione (solo se identico byte per byte a quello in `ort31/`). Chi non sceglie Parakeet non scarica niente di più.
**Verifica con WebKit (richiesta):** `e2e/f19-webkit-motori.spec.ts` (progetto `app-webkit`): nella **stessa pagina, senza ricaricare**, Whisper (1.22) → Parakeet (1.31) → di nuovo Whisper trascrivono la stessa registrazione: Whisper «Ciao a tutti! Questa è una prova della ditatura.», Parakeet «Ciao a tutti! Questa è una prova della dettatura.», senza errori. **Limite:** è il WebKit di Playwright su Windows, **non Safari su iPhone**; non ho un iPhone.

## Punto 6 — Lingua: cosa ho verificato e quali sono i rischi
Parakeet ignora la «lingua della dettatura» e riconosce la lingua da solo. Prova (`e2e/f19-lingua-parakeet.spec.ts`, modello vero):

| Registrazione | Lingua attesa | Testo | Esito |
|---|---|---|---|
| italiano (voce Elsa, 2 frasi) | it | «Ciao a tutti! Questa è una prova della dettatura.» / «Domani mattina devo portare la macchina dal meccanico, poi andiamo a mangiare una pizza.» | ✅ italiano |
| inglese (voce Zira, 2 frasi) | en | «Hello World! This is a test of the offline dictation.» / «Tomorrow morning I have to take the car to the mechanic, then we are going out for lunch.» | ✅ inglese |
| **STRESS** spagnolo (testo spagnolo letto dalla voce **italiana**) | es | «Buenos días, quisiera reservar una mesa para dos personas, manana por la tarde.» | spagnolo, ma «mañana» → «manana» |
| **STRESS** francese (testo francese letto dalla voce **italiana**) | fr | «Banșur, ja ei vorrei să reșerver une tablet por due persoane de maina premide.» | ❌ **confuso: mescola italiano e francese e produce lettere rumene (ș, ă)** |

**Limite della prova (fatto):** su questo computer Windows **non ha voci francese e spagnolo**: le ultime due righe sono una prova di stress con accento italiano, **non** una prova di francese o spagnolo veri. Per francese e spagnolo con voce nativa **non ho nessun dato**.
**Rischi di lingua sbagliata (in parte ipotesi):**
1. **Fatto (dalla riga di stress):** con audio poco chiaro o con accento forte il riconoscimento della lingua può sbagliare e il testo esce **nella lingua o con le lettere sbagliate**; chi non detta nella sua lingua madre ha più rischio.
2. **Ipotesi:** frasi molto brevi o con nomi propri e parole straniere, e lingue vicine (it/es/fr/pt) possono confondersi; con Whisper la lingua della dettatura è un'istruzione («italian»), con Parakeet no.
3. **Fatto sul codice:** i **comandi vocali** («virgola», «a capo»…) sono letti nella lingua della dettatura impostata: se Parakeet scrivesse in un'altra lingua i comandi non verrebbero riconosciuti. Con italiano pulito funzionano: prova con «Buongiorno virgola vorrei un caffè punto a capo grazie mille punto» → «Buongiorno, vorrei un caffè.» + a capo + «Grazie mille.»; le parole dei comandi non restano.
4. L'app non offre nessun modo di forzare la lingua di Parakeet (il modello non lo prevede). Il testo non viene mai tradotto né corretto da noi.

## Punto 5 — Pulizia del testo
Regole (`src/speech/parakeet/clean.ts`, 6 prove): tolgo spazi in eccesso; se non ci sono né lettere né cifre → niente da scrivere; se la frase finisce con una lettera o una cifra → aggiungo «.»; se finisce già con `. , ; : ! ? …` o virgolette/parentesi → non tocco. **Nessuna parola cambia; le cifre restano cifre** («9.40», «7»; il punto va dopo «binario 7»). Nota: Parakeet scrive i numeri in cifre dove Whisper li scrive in lettere (frase di prova «nove e quaranta» → «9.40»).

## Punto 8 — Avanzamento, senza internet, cancellazione
- **Avanzamento:** barra e percentuale (da 0 a 100, somma dei byte dei 5 file); la prova controlla che le percentuali **crescano** (più di un valore visto) e che poi compaia «Il modello è pronto su questo dispositivo.».
- **Senza internet (provato):** dopo il primo scaricamento, con la rete spenta, si riapre l'app e si detta con Parakeet. **Problema trovato e risolto:** se il modello si scarica durante la *prima* visita (il programma di salvataggio offline non controlla ancora la pagina) i file del motore (`ort31/…jsep.mjs` e `.wasm`) **non venivano salvati** e senza internet il modello non sarebbe partito. Ora, prima del caricamento, la pagina li mette nella stessa memoria del programma offline (`elodict-motore`). **Ipotesi non verificata:** lo stesso vuoto potrebbe esistere per Whisper (non l'ho toccato né provato).
- **Cancellazione (provata):** «Elimina i modelli scaricati» cancella le memorie `elodict-parakeet` e `transformers-cache` e i segni «pronto»; dopo aver ricaricato, «Privato preciso» dice che il modello non c'è.

## Prove (punto 10)
| Prova | Esito |
|---|---|
| `e2e/g5-privato-preciso.spec.ts` sulla **build di produzione con base /elodict/**, **Chromium ed Edge veri**, microfono finto: 1 impostazioni e scelta di partenza invariata, crediti; 2 download con avanzamento; 3 dettatura **pulita** (testo e punto finale); **3b comandi vocali**; 4 dettatura **rumorosa** (fondo costante); 5 passaggio **Parakeet → Whisper → Parakeet → Il browser senza ricaricare** (si guardano i lavoratori della pagina: dopo ogni cambio quello vecchio **non c'è più**); 6 **senza internet**; 7 axe e **390 px**; 8 cancellazione | ✅ 9 prove × 2 browser |
| `e2e/f19-lingua-parakeet.spec.ts` (it/en vere; es/fr di stress) | ✅ 6 |
| `e2e/f19-webkit-motori.spec.ts` (WebKit: Whisper ↔ Parakeet) | ✅ 1 |
| 223 prove sulla logica (nuove: pulizia del testo, ricerca di `ort31`, copia di sicurezza con «parakeet», revisioni fisse, crediti) | ✅ |
| Le prove di prima (desktop, mobile 390 px, PWA, iPhone, dettatura in produzione, ecc.) | ✅ **537 riuscite, 18 saltate di proposito, 0 cadute** |
Due difetti trovati dalle prove e corretti: (a) l'elenco dei crediti usava `<li>` e le prove del dizionario contano gli `<li>` della finestra: ora sono paragrafi (le prove esistenti non sono state toccate); (b) il server di sviluppo cadeva con «EBUSY» osservando i file `.wasm` appena scritti nelle cartelle costruite: ora non guarda più `dist*`.

## Cosa NON ho verificato
- **iPhone vero** (Safari): il tuo misurato è con la pagina di prova (2,6–3,0 s per frasi da 4 s; 7,6 s per 14 s). Nell'app **non** è provato su un telefono; la memoria (un solo modello alla volta) è fatta per evitare la ricarica di Safari, ma non l'ho vista funzionare su iPhone. **Il modello non è in «poca memoria»**: nell'app uso le impostazioni che hai misurato (normali).
- **Francese e spagnolo con voci vere**; **voce umana**; **Mac, Linux, Android**.
- **Tempo «voce → schermo» di Parakeet nell'app**: non misurato (stima dalla pagina di prova).
- Il passaggio Whisper ↔ Parakeet su telefoni con poca memoria.

## Le 4 righe
**FUNZIONALE — PASS ✅** — «Privato preciso» scrive testo sulla build di produzione sotto `/elodict/` in Chromium ed Edge (pulito, rumoroso, comandi vocali, senza internet), con un solo modello in memoria alla volta e cancellazione completa.
**SICUREZZA — PASS ✅** — L'audio resta sul dispositivo; il modello viene da Hugging Face a revisione fissa; nessun dato nuovo; CC-BY-4.0 mostrata. Il file `public/ort31` è servito dallo stesso sito.
**QUALITÀ — PASS ✅ (con rischi dichiarati)** — `tsc` pulito; 223 prove sulla logica; 537 nel browser, 0 cadute. Rischio di lingua sbagliata documentato (sopra).
**INTEGRAZIONE — PASS ✅** — Motore di partenza invariato; Whisper non modificato (solo il ciclo del microfono è condiviso); controllo `check:dist` pulito (le funzioni di prova non sono nella build pubblicata).

## GATE COMPLESSIVO: PASS ✅
