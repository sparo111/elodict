# AUDIT_T002 — App.tsx diviso e impaginazione A4 incrementale

Data: 8 novembre 2026. Prima: commit `5f03621` (+ copertura, roadmap e correzione delle prove instabili). Nessun push fatto.

## Numeri prima / dopo

| misura | prima | dopo |
| --- | --- | --- |
| righe di `src/App.tsx` | **671** | **209** |
| file più lungo tra quelli nuovi o divisi | `Dialogs.tsx` 382 | `applyTranscript.ts` 147 (`SettingsDialog.tsx` 179) |
| prove sulla logica | 146 | **149** |
| prove nel browser | 378 (371 riuscite, 7 saltate) | **386** (376 riuscite, 10 saltate, 0 cadute) |
| impaginazione, 50 fogli, una modifica | **50–60 ms** | **3–9 ms** |
| stessa prova con computer 4 volte più lento | **250–285 ms** | **15–50 ms** |
| copertura prove sulla logica (righe / rami / funzioni) | 8,47 % / 82,32 % / 54,47 % | 8,51 % / 80,23 % / 50,32 % |
| parità con Dictate | 75,9 | 75,9 (T002 non aggiunge funzioni di Dictate) |

Le 10 prove saltate sono le 7 di prima più le 3 nuove della velocità, che si fanno solo sul computer. I tempi "dopo" sono più alti quando girano molte prove insieme (fino a 9 ms e 50 ms): sempre sotto la soglia.
La copertura è bassa perché conta **solo** le prove sulla logica: schermate e hook React sono provati dal browser, che questo strumento non misura. I moduli di logica pura (`commands/`, `text/`, `store/backup`, `onboarding/eta`, `install/detect`, `pwa/basePath`, `export/blocks`, `speech/segmenter`) sono tra il 90 e il 100 %.

## Le 4 righe

**FUNZIONALE — PASS ✅**
- Tutte le prove di prima restano verdi. Nuove: velocità su 50 fogli (LAYOUT-P1 e P2, soglia dichiarata **30 ms**, **120 ms** col computer lento), uguaglianza fra impaginazione incrementale e ricalcolata da zero (LAYOUT-E1), 3 prove sulla memoria delle righe, e SEL-R1 (BUG-006).
- LAYOUT-E1 l'ho verificata con una modifica sbagliata a mano (spostamento delle posizioni): la prova fallisce, poi ho ripristinato.
- `planPages` è rimasta una funzione pura, invariata, con le sue 9 prove.
- Nessuna dipendenza nuova in T002. (La copertura, autorizzata, ha aggiunto `@vitest/coverage-v8` solo tra le dipendenze di sviluppo.)

**SICUREZZA — PASS ✅**
- Nessun segreto, nessun nuovo accesso a internet, nessuna nuova autorizzazione. Il codice che arriva agli utenti è lo stesso di prima, solo riorganizzato.
- `npm audit`: **41 segnalazioni** (2 basse, 33 medie, 3 alte, 3 critiche). **Per il codice che arriva agli utenti ne restano 27** (25 medie, 2 alte: `sharp`, che arriva da `@huggingface/transformers` ed è usato solo in Node, non nel browser; e i pezzi di TipTap). Le altre 14 sono solo strumenti di sviluppo (`vitest`, `vite`, `tinypool`, `workbox-build`…). Rispetto a prima: +2 segnalazioni, tutte di sviluppo, entrate con la copertura. Nessuna corretta, come deciso.

**QUALITÀ — PASS ✅ (con riserve)**
- Nessun file nuovo o diviso supera le 180 righe. **Eccezione dichiarata**: `src/i18n.ts` (880 righe) è solo l'elenco dei testi in 4 lingue e non è stato toccato.
- Nessun `catch` vuoto. Nessun codice morto: `Dialogs.tsx` e il vecchio codice di `App.tsx` sono stati rimossi.
- **Riserva 1, cambio di comportamento**: `useSettings` ora tiene sempre l'ultimo valore delle impostazioni, quindi due scelte fatte nello stesso istante si sommano; prima la seconda poteva cancellare la prima. È voluto, ma è una differenza.
- **Riserva 2**: nell'avvio ora le impostazioni e il documento si leggono con due letture separate che si aspettano insieme; prima era una sola lettura combinata. La guardia `hydratedFor` (BUG-005) è intatta e la prova di gara (`f09`) è verde.
- **Riserva 3**: la misura dei tempi (`performance.measure("pageLayout.run")`) resta nel codice di produzione. Costo trascurabile; serve alle prove.
- Propongo queste **soglie di copertura** (non impostate): sulle sole cartelle di logica pura (`commands/`, `text/`, `store/backup.ts`, `onboarding/eta.ts`, `install/detect.ts`, `pwa/basePath.ts`, `export/blocks.ts`, `speech/segmenter.ts`) righe ≥ 90 % e rami ≥ 80 %; nessuna soglia globale finché non ci sono prove sulle schermate.

**INTEGRAZIONE — PASS ✅**
- Impostazioni, primo avvio, installazione, avviso di aggiornamento (con salvataggio prima di ricaricare), copia di sicurezza, esportazioni, dedica: tutte le prove esistenti passano, su computer e telefono a 390 px.
- Limite: la memoria delle righe funziona per blocco di primo livello (paragrafo, elenco, titolo…). In un elenco molto lungo un cambiamento rimisura l'intero elenco. La prova sui 50 fogli usa solo paragrafi; **elenchi lunghi non misurati**.
- Non misurato: documenti oltre i 50 fogli; telefoni veri. Il browser rifà comunque il disegno di tutta la pagina a ogni modifica (non è cosa nostra).

## Altro, richiesto prima di T002
- **Copertura**: aggiunto `npm run coverage` (`@vitest/coverage-v8`, solo sviluppo). Valore di partenza sopra.
- **Roadmap** salvata in `replica/roadmap.md`.
- **Prove instabili (BUG-006)**: `SEL-H2` e `SEL-H3` cadevano perché il test leggeva la selezione sullo schermo prima che l'editor ricevesse il focus (TipTap lo fa un frame dopo, di proposito). Riprodotte con il disegno ritardato; difetto **della prova, non dell'app**. Corretto aspettando il focus invece di allungare i tempi. Annotato in `replica/bugs.md`.

## Cose da sapere
- **`AUDIT_T001d.md` non esiste e non c'è nessun `LICENSE` né repository remoto in questa cartella.** Il messaggio diceva che licenza e pubblicazione erano già state fatte in T001d, ma qui non risulta. Non ho scelto nessuna licenza e non ho fatto nessun push. Se T001d è stato eseguito altrove, questa copia non lo contiene.
- Nessun push, come richiesto.

## GATE COMPLESSIVO: PASS ✅
(sul codice e sulle prove automatiche; la licenza resta da sistemare, vedi sopra)

## IN ATTESA DI ISTRUZIONE
Non ho iniziato T003. Se riprendevi qualcos'altro (T001d), ripartiamo da lì.
