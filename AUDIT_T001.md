# AUDIT_T001 — Elodict: installazione facile

Data: 8 novembre 2026. Ramo `master`. Commit del lavoro: `0dba1d7`, `d78cd70`, `3e9a37e`, `56b4b27` (+ documenti e flusso di pubblicazione).

## Le 4 righe

**FUNZIONALE — PASS ✅**
- Prove sulla logica: **111 → 146** (tutte riuscite). Prove nel browser: **338 → 370**; riuscite **333 → 363**, saltate **5 → 7** (le 2 nuove sono la stessa prova su telefono, saltata di proposito). Le 338 di prima: tutte ancora verdi.
- Copertura del codice (percentuale): **non misurata**. Serve il pacchetto `@vitest/coverage-v8`, e non l'ho aggiunto perché la regola dice di chiedere prima.
- Contrasto colori: `contrast.py` → 17 coppie, **0 errori** (la tavolozza non è stata toccata). Tipi: `tsc --noEmit` pulito.
- Dipendenze nuove: **solo `vite-plugin-pwa`** (solo per costruire l'app; porta con sé `workbox-build`/`workbox-window`). Nient'altro.

**SICUREZZA — PASS ✅ (con riserve da leggere)**
- Nessun segreto nel codice né nel flusso di pubblicazione (`deploy.yml` usa solo i permessi `pages: write` e `id-token: write` dati da GitHub).
- Nella copia per l'uso senza internet entrano solo i file dell'app (34 file, ~2,8 MB). I file pesanti del motore vocale (`/ort/ort-wasm*`) entrano solo dopo il primo uso, con regola «prima la copia» e al massimo 8 file. Nessun indirizzo esterno è nella copia iniziale. Provato.
- Microfono: viene chiesto solo quando l'utente preme «Consenti il microfono»; se rifiutato, spiega come riattivarlo e offre la casella senza microfono. Il flusso audio di prova viene chiuso subito. Nessuna intestazione speciale necessaria (niente COOP/COEP).
- `npm audit`: **39 segnalazioni** (2 basse, 32 medie, 3 alte, 2 critiche). Non sono state create da questo lavoro tranne quelle medie di `vite-plugin-pwa`/`workbox-build`/`@rollup/plugin-node-resolve` (solo in fase di costruzione, non finiscono nel sito). Le **critiche** (`vitest`, `tinypool`) e le alte su `vite` riguardano solo il computer di chi sviluppa. Le alte su `sharp` (arrivano da `@huggingface/transformers`) riguardano la versione per Node, non quella del browser; le medie sui pezzi di TipTap sono già nel progetto. **Non corretto**: tutte le correzioni sono salti di versione grossi (`vitest 5`, `transformers 4`) e vanno decisi da te.

**QUALITÀ — PASS ✅ (con una nota)**
- Moduli nuovi piccoli: il più lungo è `Onboarding.tsx` (232 righe), gli altri sotto 175. Logica decisionale nelle funzioni pure `detect.ts`, `eta.ts`, `basePath.ts`, tutte con prove.
- Nessun `catch` vuoto: ognuno scrive un avviso o restituisce un esito.
- Nessun codice morto o doppione trovato.
- **Nota**: la regola chiedeva di non aggiungere righe a `App.tsx`. Sono passate da 617 a 671 (+54): sono solo gli agganci (importazioni, 2 stati, 3 piccoli gestori, 4 componenti nel disegno della pagina); la logica sta in `src/install/`, `src/onboarding/`, `src/pwa/`. Non l'ho ridotta ulteriormente.
- Altra differenza dalla richiesta: «Privato» scarica il modello **medio (~80 MB)**, non quello piccolo da 40 MB, perché in italiano il piccolo ha sbagliato una parola nella prova. Il testo mostra la misura vera. Si cambia in una riga (`ONBOARDING_MODEL`).

**INTEGRAZIONE — PASS ✅**
- Ogni modulo ha prove: logica (`detect`, `basePath`, tempo stimato, microfono, copia di sicurezza con il campo nuovo) e browser (`pwa-installabile`, `pwa-base`).
- Impostazioni e caricamento iniziale: il campo `onboardingDone` è nelle impostazioni (Dexie), nella copia di sicurezza (valore di partenza `false` se manca) e specchiato nella memoria locale per evitare lampeggi. La protezione `hydratedFor` (BUG-005) **non è stata toccata**; la prova di gara (`f09`) è ancora verde.
- L'avviso «nuova versione» salva il documento prima di ricaricare e non ricarica se il salvataggio fallisce. Provato con una versione finta: il testo digitato dopo la comparsa dell'avviso c'è ancora dopo l'aggiornamento.

## GATE COMPLESSIVO: PASS ✅ (sul codice e sulle prove automatiche)
Non vuol dire «pronto per il pubblico»: vedi sotto cosa non si è potuto verificare.

## IN ATTESA DI ISTRUZIONE
Non ho avviato altri compiti. Ho creato il repository remoto? **No.** Niente è pubblico.

---

## Cosa NON è stato possibile verificare
- **Installazione su un iPhone vero**, su un **Android fisico**, su **Edge/Chrome veri su Windows**: nelle prove l'invito del programma e il Safari dell'iPhone sono **simulati** (identificativo del browser e un evento finto). Il comportamento reale del pulsante «Installa» non è provato.
- **Aggiornamento vero** dopo una pubblicazione online: provato solo cambiando a mano il file del service worker sulla copia locale.
- **Uso offline con Whisper vero** sulla copia costruita (scaricare il modello e poi riaprire senza internet): non provato. La prova offline fatta usa la casella «Prova senza microfono». Sulla copia costruita c'è però un file `.wasm` da 21 MB con nome a codice che l'app non dovrebbe usare e che sta nel sito pubblicato: da togliere dopo una prova con Whisper vero.
- **Dove finiscono i pesi del modello** (Hugging Face) nell'uso offline: li tiene Transformers.js nella sua memoria, e non è stato riverificato sulla copia costruita.
- **Pubblicazione su GitHub Pages**: il flusso è scritto ma **mai eseguito**.
- La **stampa** di `installa.html` è controllata solo come numero di pagine (una A4 per lingua), non a occhio su carta.
- Voce umana vera, Word vero, spagnolo da madrelingua, marchio: come prima.

## Scelta dell'hosting e perché
Il motore vocale gira con **un solo filo** (`numThreads = 1`), quindi **non** servono le intestazioni COOP/COEP → **GitHub Pages** basta, gratis e con HTTPS. Cloudflare Pages non è necessario (nessun account da creare). Con più fili sarebbe più veloce su computer potenti, ma non l'ho misurato e non è necessario adesso.

## Per pubblicare: comandi da copiare (Git Bash, utente `sparo111`)
**Prima decidi**: non c'è ancora una licenza. Rendere il repository pubblico senza licenza significa «tutti i diritti riservati»: altri possono vederlo ma non riusarlo. Scegline una (per esempio MIT) prima di renderlo pubblico.

```bash
cd <la cartella del progetto>

# 1) controlla che sia tutto salvato
git status

# 2) rinomina il ramo in "main" (il flusso lo accetta anche come "master")
git branch -M main

# 3) crea il repository su GitHub e carica il lavoro (richiede: gh auth login, una volta sola)
gh repo create sparo111/elodict --public --source=. --remote=origin --push

# 4) attiva GitHub Pages con "GitHub Actions" come sorgente
gh api -X POST repos/sparo111/elodict/pages -f build_type=workflow
```

Se non vuoi usare `gh`: crea a mano il repository vuoto `elodict` su github.com, poi:

```bash
git remote add origin https://github.com/sparo111/elodict.git
git branch -M main
git push -u origin main
```
e su GitHub: *Settings → Pages → Build and deployment → Source: GitHub Actions*.

Dopo 2–3 minuti l'indirizzo sarà **https://sparo111.github.io/elodict/**. Il flusso (`.github/workflows/deploy.yml`) costruisce con `VITE_BASE=/elodict/`; se scegli un nome diverso per il repository, cambia da solo.
