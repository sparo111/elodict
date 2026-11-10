# AUDIT_T013e — Dettatura «Privato» senza rete: verifica e correzione

Data: 10 novembre 2026. Sito: https://sparo111.github.io/elodict/

## Cosa ho visto (FATTI), prima di toccare il codice

Prova nuova `e2e/g6-privato-senza-rete.spec.ts`, su profilo vuoto, sulla build di produzione sotto `/elodict/` (Chromium, microfono finto con la voce di `speech-it.wav`): si apre l'app, si sceglie il modo, si aspetta il download del modello, si detta; poi rete spenta (`context.setOffline(true)`), pagina ricaricata, si detta ancora. Si registrano le richieste fallite.

| Caso (prima della correzione) | Con rete | Senza rete |
| --- | --- | --- |
| «Privato» (Whisper piccolo), **prima visita** (nessun ricaricamento prima di scegliere) | testo scritto | **NON parte**: non arriva mai a «Ti ascolto…» (atteso 5 minuti) |
| «Privato» (Whisper), dopo un ricaricamento (pagina già controllata dal programma offline) | testo scritto | testo scritto, 0 richieste fallite |
| «Privato preciso» (Parakeet), prima visita | testo scritto | testo scritto |
| «Privato preciso» (Parakeet), dopo un ricaricamento | testo scritto | testo scritto |

- Il caso che falliva è stato riprodotto **2 volte su 2** (due esecuzioni separate).
- Stato dopo il primo uso di Whisper alla prima visita: programma offline attivo (`swAttivo: true`) ma **non controlla la pagina** (`swControllaLaPagina: false`); memorie presenti: `workbox-precache…` e `transformers-cache`; **la memoria `elodict-motore` non esiste**, i file del motore salvati sono 0.
- Con rete, Whisper chiede 2 file del motore: `/elodict/ort/ort-wasm-simd-threaded.jsep.mjs` e `…jsep.wasm` (Parakeet: gli stessi in `/elodict/ort31/`).
- Richieste fallite senza rete, nel caso che non partiva: `GET /elodict/ort/ort-wasm-simd-threaded.jsep.mjs` due volte (`ERR_INTERNET_DISCONNECTED` fatta dal programma offline, `ERR_FAILED` fatta dalla pagina/lavoratore). Il `.wasm` non viene nemmeno chiesto: il lavoratore si ferma prima.
- Dopo la correzione, **le stesse due richieste a `…jsep.mjs` risultano ancora fallite** senza rete, in **tutti** i casi (anche in quelli che funzionavano già prima, Parakeet compreso), e la dettatura riesce lo stesso.

## La mia interpretazione (NON verificata come causa unica)

- Causa probabile: alla prima visita il programma offline non controlla ancora la pagina, quindi la regola che salva i file di `ort/` (`runtimeCaching`, `elodict-motore`) non scatta. Parakeet aveva già un rimedio (`warmEngineCache`, T013d); Whisper no. È coerente con il fatto che il caso «dopo un ricaricamento» funziona senza correzioni.
- Le due richieste ancora fallite senza rete non impediscono niente nelle prove; **non ne conosco la causa** (potrebbe essere un primo tentativo che non trova il file nella memoria e poi un secondo che lo trova). Non l'ho indagata.

## Correzione (solo perché la prova falliva)

- `src/pwa/engineCache.ts` (51 righe, nuovo): `warmEngineCache(cartella)` mette nella memoria `elodict-motore` i due file del motore che mancano, con indirizzo completo, **solo se mancano e solo se la risposta è 200**; non lancia mai errori (li scrive in console). 8 prove sulla logica.
- `src/speech/whisper.ts`: `prepareModel` ora prima chiama `warmEngineCache("ort")`, poi carica il modello. Vale per tutti i modi di scegliere «Privato» (Impostazioni, primo avvio, tasto Detta).
- `src/speech/parakeetEngine.ts`: la copia locale dello stesso rimedio è stata sostituita dalla funzione condivisa (`"ort31"`); comportamento uguale.
- **Protezione in più (trovata dalla prova del cambio di idea)**: i file del motore possono arrivare lentamente. Se in quel momento l'utente passa a «Il browser», non deve partire nessun lavoratore né download. La prova `3.` era **rossa** (il lavoratore partiva lo stesso): `releaseWhisper()` e `releaseParakeet()` uscivano subito se il lavoratore non esisteva ancora, senza annullare il caricamento in attesa. Ora annullano lo stato anche in quel caso; il caricamento in attesa si ferma («modello chiuso»). Dopo: verde.
- Vincoli rispettati: nessun passo in più per l'utente; i file si salvano solo quando si sceglie un modo offline (non all'apertura dell'app); un solo modello in memoria alla volta (prova 3 e `g5` caso 5 verdi); `navigateFallbackDenylist` e `vite.config.ts` **non toccati**.

## Risultati dopo la correzione

| Prova | Esito |
| --- | --- |
| `g6` su build di produzione `/elodict/`, **Chromium**: Whisper e Parakeet × (prima visita, dopo ricaricamento) × (con rete, senza rete) + cambio di idea | **9/9** |
| `g6` stessa build, **Microsoft Edge** | **9/9** |
| `g6` sul **sito pubblicato** https://sparo111.github.io/elodict/ (Chromium, dopo il deploy) | **9/9** |
| Prove sulla logica (con soglie di copertura 90 % righe / 80 % rami) | **231** riuscite (223 + 8 nuove), soglie rispettate |
| Browser, comando `npx playwright test`, con le modifiche | **548 riuscite, 57 saltate, 0 cadute** (605) |

**Confronto con la tua base 537/18/0**: ho rimisurato la situazione di partenza con lo stesso comando (modifiche messe da parte con `git stash`, poi riportate): **537 riuscite, 48 saltate, 1 caduta** (587). Le saltate sono 48, non 18: non ho analizzato da cosa dipenda la differenza con i tuoi numeri (la maggior parte sono prove che servono `SITE_URL` o che si fanno solo sul computer). Le +9 saltate di adesso sono le 9 di `g6` nel progetto «sito-pubblicato» senza `SITE_URL`.
**La caduta di partenza** era `f08 OFF-H2` (nulla a che fare con questo compito): la frase «l'audio non lascia il tuo dispositivo» ora compare anche nella nota di «Privato preciso» (T013d) e, sotto carico, la finestra delle impostazioni è ancora nella pagina un attimo dopo la chiusura, quindi la ricerca trovava 2 elementi. Da sola passava 25/25. Ho reso la ricerca non ambigua (solo nel corpo della pagina): 30/30 sotto carico, `f08` intero 11/11. È una modifica a una prova esistente, fuori da quanto chiesto, minima e dichiarata qui.

## Le 4 righe

**FUNZIONALE — PASS ✅** — «Privato» (Whisper) ora funziona senza rete anche se il modello si scarica alla prima visita; «Privato preciso» già funzionava e continua. Provato in Chromium, Edge e sul sito pubblicato.

**SICUREZZA — PASS ✅** — Nessun nuovo indirizzo contattato (si usano gli stessi file del sito, `/ort/` e `/ort31/`). Nella memoria entrano solo risposte 200 dello stesso sito; niente segreti. Nessun modello viene scaricato se l'utente non lo sceglie (verificato: cambio di idea → nessuna richiesta a huggingface.co). `npm audit`: 41 segnalazioni, 27 per il codice degli utenti, invariate; nessuna dipendenza nuova.

**QUALITÀ — PASS ✅** — Una sola funzione per Whisper e Parakeet (tolta una copia). Nessun `catch` vuoto nuovo (l'errore si scrive in console). `engineCache.ts` 51 righe. Riserve: le due richieste a `jsep.mjs` che falliscono senza rete (sopra); `whisper.ts` è a 310 righe (era già oltre le 250 prima di questo compito).

**INTEGRAZIONE — PASS ✅** — Tutte le prove esistenti verdi (548/0). Impostazioni, primo avvio, aggiornamento dell'app, `installa.html?lang=` e il resto del programma offline non toccati. Il flusso di pubblicazione (prove con soglie, build, controllo degli agganci di prova, deploy) è riuscito al primo tentativo.

## Cosa NON è verificato
- **Firefox, Safari/WebKit e telefoni veri** per la dettatura senza rete (provati solo Chromium ed Edge sul computer; `g6` non gira in WebKit).
- **Modello medio di Whisper («base», ~80 MB)**: provato solo il piccolo (`G6_WHISPER_MODEL=base` lo prova, non l'ho lanciato). Il percorso del codice è lo stesso.
- Una rete **lenta davvero** o che cade a metà: simulato solo il ritardo del file grande del motore (6 s).
- Voce umana vera: tutte le prove usano una registrazione.
- Il limite `maxEntries: 8` della memoria `elodict-motore` (oggi servono 4 file in tutto): con altri motori in futuro andrà riguardato.

## GATE COMPLESSIVO: PASS ✅

## IN ATTESA DI ISTRUZIONE
