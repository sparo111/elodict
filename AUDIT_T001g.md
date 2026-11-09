# AUDIT_T001g — Nuova icona dell'app

Data: 9 novembre 2026.

## Sorgente
- Il file giusto era `C:\Users\lagga\Downloads\Documento smeraldo con onde sonore verdi.png`. Verifiche, tutte riuscite prima di usarlo: SHA-256 `e5bed38bb863b409a5ab5bf1adc8b53c20cb3d4d954e180322b9cff64993bb7a` (identico a quello indicato), **1254x1254**, nessun canale trasparente, pixel (5,5) = RGB(166,220,251), pixel (735,760) = RGB(12,173,97).
- Copiato in **`design/icona-elodict.png`**, fuori da `public/`: non finisce nel sito (verificato: la build di produzione `dist-prod` non contiene né `design/` né il file; una prova lo controlla).
- Cancellati: `public/icons/icona-elodict.png` (il confronto 560x260, mai tracciato da git) e la copia dello stesso confronto in Downloads.

## Cosa è cambiato
- `scripts/make-icons.mjs` ora parte da `design/icona-elodict.png` (non più dall'SVG) e produce, con Chromium di Playwright e riduzione a passi: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (stessa immagine delle altre, come indicato), `apple-touch-icon.png` (180) e **due favicon PNG** (`favicon-32.png`, `favicon-48.png`).
- Il vecchio `public/favicon.svg` (la «E» viola) è tolto; `index.html` e `public/installa.html` ora collegano le favicon PNG e l'`apple-touch-icon`; `vite.config.ts` ha le nuove voci in `includeAssets`.
- **Manifest: i nomi dei file delle icone non sono cambiati**, quindi il manifest è invariato. **Colori invariati**: `theme_color` `#5b34c9` e `background_color` `#ffffff` vengono dai token di design e sono una scelta fatta apposta; non li ho legati allo sfondo `#A9DDFB` dell'icona (come da istruzione).
- Documenti: `RIEPILOGO.md` (come si rigenerano le icone) e `replica/brand.md` (l'icona attuale al posto della bozza viola).
- **Correzione trovata durante le prove (non prevista)**: quando il service worker controlla la pagina, l'indirizzo `installa.html?lang=it` — quello che l'app stessa apre da «Stampa le istruzioni» — apriva **l'app invece delle istruzioni**: il filtro `navigateFallbackDenylist` era `/installa\.html$/` e non riconosceva la parte `?lang=…`. Ora è `/installa\.html(\?.*)?$/`. Le prove di prima non lo vedevano perché la pagina non era ancora controllata dal service worker; la nuova prova ricarica prima la pagina sotto il controllo del service worker.

## Le 4 righe

**FUNZIONALE — PASS ✅** — 5 prove nuove (`e2e/pwa-icone.spec.ts`, desktop e mobile 390 px, alla radice e sotto `/elodict/`): manifest valido con le 3 icone (192, 512, 512 maskable) e le misure di ogni file lette dall'intestazione PNG; `apple-touch-icon` 180x180 e **nessun pixel trasparente**; favicon 32 e 48 collegate sia dall'app sia da `installa.html`; **maskable**: tutto il disegno sta dentro il cerchio (misurato: arriva al **74,7%** del raggio, come verificato da te; la prova richiede ≤80% e >60%) e i quattro angoli sono azzurri (166,220,251 ±15); il sorgente non è raggiungibile dal sito; a 390 px l'app e «Come si installa» si aprono senza scorrimento orizzontale.
**SICUREZZA — PASS ✅** — Nessuna dipendenza nuova; `check:dist` pulito sulla build di produzione; il sorgente (1,5 MB) non è pubblicato.
**QUALITÀ — PASS ✅** — `tsc` pulito; 200 prove sulla logica; axe senza violazioni su app e `installa.html` a 390 px; suite completa (desktop, mobile, pwa-desktop, pwa-mobile, pwa-iphone, dettatura-produzione): **513 riuscite, 12 saltate di proposito, 0 cadute**. Controllato a occhio anche `apple-touch-icon` (180) e la favicon 48: il disegno si riconosce, anche se a 32/48 px le onde sonore si vedono appena.
**INTEGRAZIONE — PASS ✅** — Il manifest, il service worker (le icone sono nella copia per l'uso senza internet) e le prove di installazione esistenti restano come prima.

## Cosa NON ho potuto verificare
- **Come appare su un telefono vero**: icona sulla schermata Home di iPhone e Android (ritaglio a cerchio o squadrato, angoli arrotondati di iOS) e nella scheda del browser. Le icone vecchie già installate restano finché non si rimuove e si rimette l'app (iOS) o non si aggiorna il manifest (Android lo fa da solo, con ritardo).
- La favicon nel browser vero a 16–32 px (qui ho guardato solo il file a 48 px).

## GATE COMPLESSIVO: PASS ✅
