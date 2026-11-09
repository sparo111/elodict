# AUDIT_T001e — Correzione per iPhone: da «Come si installa» all'app

Data: 9 novembre 2026.

Problema (provato su un iPhone vero): aprendo `installa.html` si vedevano solo le istruzioni, senza modo di arrivare all'app.

## Cosa è cambiato
- `public/installa.html`: pulsante grande **«Apri Elodict»** (it/en/fr/es) subito sotto la dedica e prima di «Cos'è Elodict». Punta a `./`, cioè alla cartella della pagina: segue da solo `VITE_BASE` (`/` in locale, `/elodict/` su GitHub Pages). Nascosto in stampa.
- Istruzioni per iPhone riscritte (4 passi): 1) «Apri Elodict», usando Safari; 2) Condividi (o prima i tre puntini … e poi Condividi); 3) «Aggiungi alla schermata Home»; 4) «Aggiungi».
- Icona di `installa.html` sulla Home: la pagina ora collega lo **stesso `manifest.webmanifest`** dell'app (`start_url` = app), l'icona `apple-touch-icon` e `apple-mobile-web-app-capable`. In più, se è aperta in modalità app (`navigator.standalone` o `display-mode: standalone`), va subito all'app: copre le versioni di iOS che non leggono il manifest.
- Prove: `e2e/pwa-iphone.spec.ts` e progetto `pwa-iphone` in `playwright.config.ts` (WebKit, profilo `iPhone 15`).

## Le 4 righe

**FUNZIONALE — PASS ✅** — 11 prove nuove con WebKit + iPhone 15, tutte riuscite: pulsante visibile senza scorrere, alto ≥56 px e largo >300 px, tra dedica e «Cos'è Elodict» nelle 4 lingue; un tocco porta all'app (`/`) e il primo avvio parte («Che lingua parli?» → «Avanti» → «Consenti il microfono»); sotto `/elodict/` il pulsante porta a `/elodict/` e il manifest ha `start_url` `/elodict/`; `installa.html` e l'app collegano lo stesso manifest; in modalità app `installa.html` apre l'app, altrimenti resta sulle istruzioni.

**SICUREZZA — PASS ✅** — Nessuna nuova dipendenza, nessun dato nuovo; solo un collegamento relativo e un reindirizzamento alla stessa origine.

**QUALITÀ — PASS ✅ (con una nota)** — `tsc` pulito; 194 prove sulla logica riuscite; con axe nessuna violazione su `installa.html` (4 lingue) e sull'app a iPhone; la stampa resta su **1 foglio A4 per lingua** (pulsante nascosto in stampa; prova fatta con Chromium perché WebKit non crea PDF). Suite nel browser (desktop, mobile, pwa-desktop, pwa-mobile, pwa-iphone): 476 riuscite, 12 saltate di proposito, 1 caduta (`WHISPER-IT-base`, Whisper vero sul desktop) per tempo scaduto sotto carico: rilanciata da sola è riuscita (26,8 s). Il primo giro della prova di stampa è fallito per un errore della prova stessa (l'emulazione «screen» rimetteva il pulsante nel PDF e la lingua dopo ereditava la stampa): corretta la prova, non la pagina.

**INTEGRAZIONE — PASS ✅** — Il pulsante, il manifest e la modalità app convivono con il service worker (`installa.html` resta fuori dal ripiego di navigazione) e con le prove esistenti (`pwa-installabile` invariata e riuscita).

## Cosa NON ho potuto verificare
- **Aggiungere davvero alla Home su un iPhone fisico** e toccare l'icona: WebKit di Playwright non ha la schermata Home; la modalità app è simulata con `navigator.standalone`. Da riprovare sul telefono dopo la pubblicazione (se la Home aveva già salvato la vecchia `installa.html`, va tolta e rifatta).
- Safari vero (il motore è lo stesso, ma non l'interfaccia: menu Condividi, tre puntini).
- Il sito pubblicato dopo il push: controllato nella sezione sotto.

## GATE COMPLESSIVO: PASS ✅
