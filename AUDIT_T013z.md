# AUDIT_T013z — «La dettatura non scrive più» (motore «Privato»)

Data: 9 novembre 2026.

Sintomo riferito: sul sito pubblicato, con Edge su Windows e con Safari su iPhone, motore «Privato», modello base già scaricato: il microfono si attiva, la barra della «Prova del microfono» si muove forte, ma parlando non compare testo (Win+H sullo stesso PC funziona).

## FATTI (provati qui, con prove che si possono rilanciare)

1. **Il guasto si riproduce sul sito pubblicato, con Edge vero** (`channel: "msedge"`, `https://sparo111.github.io/elodict/`, motore «Privato»), quando il microfono ha un **fondo di rumore costante** (RMS 0,03, un livello normale per molti microfoni di computer e telefoni): l'editor resta vuoto e compare l'avviso dell'app «Sto ascoltando ma non arriva testo…». Con un microfono «pulito» (silenzio perfetto tra le frasi) lo stesso sito scrive: «Ciao a tutti questa è una prova della dettatura». Prova: `e2e/g2-dettatura-pubblicata.spec.ts` (`G2-msedge-rumoroso` fallisce, `G2-msedge-pulito` passa) sul sito pubblicato prima della correzione.
2. **La causa è nel taglio delle frasi** (`src/speech/segmenter.ts`). Il rumore di fondo si adattava solo quando «nessuno parla»; ma con un fondo sopra la soglia minima (0,012) il programma credeva di sentire una voce fin dal primo istante, e così il fondo non si adattava mai e la pausa che chiude la frase non arrivava mai. L'audio restava in un'unica «frase» fino al taglio forzato dei 20 secondi (e un fondo più forte dava una frase lunghissima di sola confusione). Prova sul codice: con fondo 0,02–0,03 il segmentatore dava **una frase da 17 s invece di tre da ~3 s**; con fondo ≤0,012 funzionava.
3. **Non è una regressione e `git bisect` non serve**: `src/speech/segmenter.ts` è identico a com'era al primo commit di Whisper (`66f54b1`: `git diff 66f54b1 HEAD -- src/speech/segmenter.ts` è vuoto). Ho anche costruito la versione `v-prima-di-T004` (base `/elodict/`) e lanciato la stessa prova con Edge: **fallisce allo stesso modo** (rumoroso) e passa col pulito. Quindi il difetto c'è da sempre, in T004 o dopo non è stato introdotto.
4. **Non c'è nessuna differenza tra locale e online**: la build di produzione con base `/elodict/`, i file `ort/*.wasm|.mjs`, il lavoratore, il service worker (anche alla seconda e terza visita, con il modello già in memoria) funzionano sul sito pubblicato con microfono pulito; nessuna richiesta fallita, nessun errore in console né nel lavoratore (solo l'avviso «Unable to determine content-length…», innocuo).
5. **Correzione** (`segmenter.ts`): il fondo ora si stima anche mentre il programma crede di sentire una voce (20° percentile degli ultimi ~3 s, in salita al massimo del 3% a frame, così una frase detta senza pause non lo trascina su). Con il fondo 0,03 il testo compare con la frase, nel tempo normale. Prove nuove sul codice (4 casi di rumore costante 0,02/0,03; frase lunga senza pause non spezzata; solo rumore senza parlato non manda nulla a Whisper): 200 prove sulla logica passano (194 + 6).
6. **Prova che non ci faccia ricadere**: `npm run test:dettatura` costruisce la **build di produzione** (`npm run build`, senza agganci per le prove) con base `/elodict/`, la serve e prova con **Edge vero e con Chromium**, microfono finto «pulito» e «rumoroso», motore «Privato»: **fallisce** se il testo non compare entro 15 s dall'ascolto (con il difetto, il testo usciva solo al taglio dei 20 s). 4 su 4 riuscite dopo la correzione. Stessa prova, contro un sito qualsiasi: `SITE_URL=… npx playwright test --project=sito-pubblicato g2-`.
7. Suite completa dopo le modifiche: **503 riuscite, 12 saltate di proposito, 0 cadute** (desktop, mobile, pwa-desktop, pwa-mobile, pwa-iphone, dettatura-produzione), più 200 sulla logica; la dettatura vera con Whisper (it/en, tiny/base) nella suite di sempre è riuscita.
8. Il vecchio test del sito pubblicato (`PUB-8`) controllava solo che comparisse «Ti ascolto…» e che i file del motore fossero chiesti dal percorso giusto: **non controllava che comparisse testo**. È il buco che ha lasciato passare il difetto.

## IPOTESI (non verificate)

- **Che il tuo guasto sia proprio questo.** Non ho il tuo microfono né il tuo audio. Il sintomo coincide (barra forte, avvio normale, nessun testo, avviso «non arriva testo») e l'ho riprodotto con un fondo costante, ma non ho misurato il livello del tuo fondo. Dopo la pubblicazione: se sul tuo PC il testo ora compare, l'ipotesi è confermata; se no, serve un altro dato (livello della «Prova del microfono» a voce ferma).
- **«Prima funzionava su iPhone».** Possibili spiegazioni, nessuna verificata: un ambiente più silenzioso, il riconoscimento del browser (predefinito, diverso da «Privato») invece di Whisper, o una differenza di quel momento. Il codice del percorso Whisper non è cambiato in modo sostanziale dopo la sua nascita (nel tag `v-prima-di-T004` il difetto c'era già).
- **iPhone (Safari)**: oltre al fondo rumoroso, un secondo possibile motivo è che Safari avvia l'audio solo da un gesto dell'utente, e il contesto audio veniva creato dopo il caricamento del modello, cioè quando il gesto non c'è più. Ho spostato la creazione e l'avvio del contesto audio **al tocco di «Detta»** (`whisper.ts`, e il contesto si chiude se l'avvio fallisce o si preme Ferma). È una **precauzione**, non una correzione provata: su Chromium/Edge non cambia nulla di visibile.

## Cosa NON ho potuto provare
- **WebKit/iPhone**: il WebKit di Playwright su Windows **non ha né `AudioContext` né `mediaDevices`** (verificato nel browser: entrambi `undefined`, anche con il profilo iPhone 15); la prova `G2-webkit` si salta e lo dice. L'iPhone vero resta da provare a mano.
- **«Il browser» (riconoscimento di Edge/Safari)**: nelle prove automatiche (Edge) il riconoscimento integrato usa il microfono vero del computer, non quello finto, e risponde «nessun microfono»; non si può provare senza un microfono vero e voce umana.
- **Un microfono vero e una voce umana**, ovunque.

## Le 4 righe

**FUNZIONALE — PASS ✅ (sul caso riprodotto)** — Con fondo costante e con microfono pulito la dettatura «Privato» scrive sulla build di produzione sotto `/elodict/`, con Edge e Chromium. Non è provato sul tuo PC né sul tuo iPhone.
**SICUREZZA — PASS ✅** — Nessuna dipendenza nuova; l'audio resta sul dispositivo.
**QUALITÀ — PASS ✅** — 200 prove sulla logica; 503 nel browser, 0 cadute; nuova prova sulla build di produzione che fallisce se non compare testo.
**INTEGRAZIONE — PASS ✅** — `Segmenter` mantiene i comportamenti di prima (tutte le prove di sempre invariate); il contesto audio ora nasce in `start()` e si chiude in ogni via d'uscita.

## GATE COMPLESSIVO: PASS ✅ per quanto provato; la conferma sul tuo PC e sul tuo iPhone resta da fare.
