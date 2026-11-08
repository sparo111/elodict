# AUDIT_T004 — Elenco dei documenti con ricerca, cestino, migrazione del database

Data: 8 novembre 2026. Nessun push, nessuna licenza scelta, nessun repository creato.

## Numeri prima / dopo

| misura | prima | dopo |
| --- | --- | --- |
| prove sulla logica | 159 | **188** |
| prove nel browser | 404 (393 riuscite, 11 saltate) | **454** (442 riuscite, 12 saltate, 0 cadute) |
| righe di `src/App.tsx` | 211 | 220 (+9: nuovo pulsante, avviso del database, gancio per cambiare documento) |
| `npm audit` | 41 (27 per il codice che arriva agli utenti) | 41 (27): invariato |
| dipendenze nuove | — | nessuna |
| parità con Dictate | 75,9 | 75,9 (l'elenco dei documenti non è una funzione di Dictate: non conta) |
| copertura, definizione vecchia (tutto il repository) | 8,68 % delle righe | 6,04 % |
| copertura, solo `src/` | non misurata | 22,34 % righe, 88,18 % rami |

La copertura con la definizione vecchia **scende** (8,68 → 6,04 %) perché ho aggiunto molto codice di schermate (elenco, finestre) che è provato dalle prove nel browser, e quello strumento conta solo le prove sulla logica. Non è un peggioramento della logica: le soglie qui sotto misurano quella.
Le 12 saltate: le 11 di prima più una (documenti di oltre 20 MB) che si fa solo sul computer.

## Soglie di copertura (impostate in `vite.config.ts`, valgono con `npm run coverage` e ora anche nel flusso di pubblicazione)

Righe ≥ 90 % e rami ≥ 80 %, **cartella per cartella**. Risultato di oggi, tutte sopra la soglia, **nessuna abbassata e nessuna esclusa**:

| cartella o file incluso | righe | rami |
| --- | --- | --- |
| `src/commands/` (tutta, tranne i soli tipi `types.ts`) | 100 % | 96,55 % |
| `src/text/` (tutta) | 100 % | 98,70 % |
| `src/documents/` (i file di logica: `plainText`, `search`, `trash`, `order`; le schermate sono in `documents/ui/`, **fuori**) | 98,90 % | 98,36 % |
| `src/store/backup.ts` | 100 % | 95,91 % |
| `src/audio/devices.ts` | 100 % | 96,15 % |
| `src/export/blocks.ts` | 98,14 % | 84,81 % |
| `src/speech/segmenter.ts` | 100 % | 97,43 % |
| `src/onboarding/eta.ts` e `src/onboarding/mic.ts` | 100 % | 93,33 % (insieme) |
| `src/install/detect.ts` | 100 % | 100 % |
| `src/pwa/basePath.ts` | 100 % | 100 % |

Precisazioni oneste:
- Le cartelle `store/`, `export/`, `speech/`, `onboarding/`, `install/`, `pwa/`, `audio/` contengono anche codice che dipende dal browser: di quelle ho incluso **solo i file di logica pura** elencati, non la cartella intera.
- Fuori dalle soglie, perché provato dalle prove nel browser: `components/`, `app/`, `documents/ui/`, `install/` (schermate), `onboarding/Onboarding.tsx`, `pwa/` (aggiornamento), `speech/whisper*.ts` e `recognizer.ts`, `store/db.ts`, `documents.ts`, `rawBackup.ts`, `migrations.ts`, `editor/` (impaginazione), `export/build.ts`, `share/`.
- Due file erano sotto soglia da soli, e li ho coperti con prove nuove: `install/detect.ts` (75 % righe → 100 %, funzione `readInstallEnv`) e `text/edit.ts` (rami 76,5 % → 97,6 %). La cartella `text/` nel complesso era già sopra.
- Le soglie falliscono davvero: l'avevo visto quando `documents/` includeva ancora `useLibrary.ts` (50 % righe, errore). Non l'ho escluso: ho spostato le schermate in una sottocartella, così `documents/` è davvero solo logica.

## Le 4 righe

**FUNZIONALE — PASS ✅**
- **Migrazione**: la prova che chiedevi è stata scritta **prima** di cambiare lo schema ed è passata sullo schema vecchio (commit `121f4d1`). Parte da un database della versione 1 con un documento e impostazioni complete (dizionario di 2 voci, microfono `mic-b`, motore offline, modello piccolo…). Dopo l'apertura con lo schema nuovo (versione 2): le impostazioni sono **identiche campo per campo**, il documento è identico con in più la sola «ultima apertura» (uguale all'ultima modifica), e l'app usa davvero motore e dizionario salvati. Provato con 1 e con 3 documenti, su computer e telefono.
- **Migrazione che fallisce** (MIG-N1): il database resta alla versione 1 con gli stessi dati, l'app avvisa («Non riesco ad aprire i tuoi documenti salvati… Non è stato cancellato niente»), **non salva niente** (anche scrivendo), e offre «Scarica la copia di sicurezza», letta senza passare dalla migrazione: il file contiene il documento e le impostazioni di prima. Risolto il guasto, la stessa pagina migra senza perdere nulla.
- **Elenco**: titolo, data, prime parole; apri, nuovo, rinomina, duplica; **elimina con conferma → cestino 30 giorni** (ripristina, o elimina per sempre con una seconda conferma). Scadenza provata con date finte: dopo 31 giorni si cancella da sola, a 29 giorni e 23 ore no. I documenti nel cestino non compaiono in elenco, ricerca né all'avvio.
- **Ricerca**: nel titolo e nel testo, più parole insieme, senza badare a maiuscole e accenti («perche» trova «perché»), con la parola evidenziata.
- **Cambiare documento**: salva prima quello aperto; «annulla» non riporta il testo dell'altro documento (verificato anche togliendo il ripristino: la prova allora fallisce); un nome scelto dall'utente non viene più riscritto dal salvataggio automatico e diventa il nome proposto per il file esportato.
- **Limiti della copia di sicurezza**: 200 documenti **sì**, 201 **no**, oltre 20 MB **no**: in quei casi nessun file e un messaggio che dice cosa fare (prima si sarebbe scritto un file che poi non si poteva rileggere). Il cestino non entra nella copia. «Nuovo» e «Duplica» si fermano a 200 documenti con un avviso.
- Le copie di sicurezza della versione 1 si importano ancora come prima (prove esistenti verdi).

**SICUREZZA — PASS ✅ (con una nota)**
- Nessuna cancellazione automatica salvo il cestino scaduto (30 giorni) e le conferme esplicite dell'utente. L'unico punto del codice che elimina righe è `store/documents.ts` (`deleteForever`, `purgeExpired`); il database non viene mai cancellato interamente.
- Titoli e testi dei documenti sono mostrati come testo normale (nessun HTML inserito a mano).
- **Nota**: la migrazione legge una variabile globale (`__ELODICT_FAIL_MIGRATION__`) che serve solo alle prove per simulare il guasto. Nessuna parte dell'app la imposta; chi la imposta dalla console farebbe solo fallire la propria migrazione. È dichiarata nel codice (`store/migrations.ts`). L'ho dovuta aggiungere perché Dexie 4 apre senza errori anche un database di versione più alta, quindi non c'è un guasto «naturale» da riprodurre.
- La copia di emergenza si scarica sul computer dell'utente; niente viene inviato. Nessun nuovo accesso a internet, nessun segreto.
- `npm audit`: **41 segnalazioni** (2 basse, 33 medie, 3 alte, 3 critiche); **27 toccano il codice che arriva agli utenti** (25 medie, 2 alte: `sharp`, usato solo in Node, e pezzi di TipTap). Le altre 14 sono strumenti di sviluppo. Nessuna è nuova.

**QUALITÀ — PASS ✅ (con riserve)**
- File nuovi piccoli: il più lungo è `DocumentItem.tsx` (153 righe); `useDocumentStore.ts` 138; `db.ts` 119. Testi solo in `src/i18n.ts`, stesse 42 chiavi nelle 4 lingue; nessun colore nuovo (`contrast.py`: 0 errori su 17 coppie).
- Nessun `catch` vuoto; il codice vecchio (`loadLastDocument`) è stato rimosso.
- axe: l'elenco, la ricerca, le conferme e il cestino non hanno errori di accessibilità (computer e telefono 390 px). Axe aveva trovato un errore vero (il nome accessibile del pulsante «apri» non conteneva il testo visibile): corretto.
- **Riserva 1**: il documento nuovo entra nell'elenco solo quando ci si scrive qualcosa (scelta voluta, per non riempire l'elenco di fogli vuoti). Se si crea un foglio vuoto e si ricarica, si riapre l'ultimo documento scritto, non il foglio vuoto.
- **Riserva 2**: il limite di 200 documenti è controllato da «Nuovo» e «Duplica»; ripristinando una copia di sicurezza si può superarlo. In quel caso la copia successiva dirà che sono troppi.
- **Riserva 3**: la lingua del documento viene riscritta ad ogni salvataggio con la lingua di dettatura del momento (comportamento di prima, non cambiato).
- **Riserva 4**: se il database non si apre e c'è un aggiornamento dell'app, «Aggiorna» ricarica comunque (non c'è niente da salvare, e il testo scritto in quel momento andrebbe perso). L'avviso già dice che non viene salvato.

**INTEGRAZIONE — PASS ✅**
- Tutte le prove di prima restano verdi, su computer e telefono, comprese impostazioni, primo avvio, installazione, scelta del microfono, esportazioni, dedica, copia di sicurezza, la guardia `hydratedFor` (BUG-005) e la prova di gara. Le prove nuove ripetute 3 volte di fila: 147 su 147.
- Il flusso di pubblicazione ora esegue `npm run coverage` (prove sulla logica **con le soglie**) al posto di `npm test`. Non è stato eseguito (nessun repository).
- Il database passa da versione 1 a 2 in una sola transazione: o riesce tutta o niente cambia.

## Cosa NON è verificato
- **Un vero database della versione 1 di un browser vero**: quello delle prove l'ho costruito a mano con la stessa struttura (tabelle `documents` con indice `updatedAt` e `settings`, versione IndexedDB 10) e non ho potuto confrontarlo con uno creato dall'app vecchia.
- **Migrazione con la quota piena, o con due schede aperte** (Dexie può restare bloccato finché l'altra scheda non si chiude) e in **Firefox/Safari**: provato solo in Chromium.
- Cosa succede con **molti documenti grandi** (decine di MB) oltre il caso dei 20 MB provato.
- Il cestino con l'orologio vero del dispositivo (provato con date finte); un orologio spostato indietro/avanti allungherebbe o accorcerebbe i 30 giorni.
- Voce umana vera, Word vero, telefoni veri.

## GATE COMPLESSIVO: PASS ✅
(sul codice e sulle prove automatiche; licenza e pubblicazione restano da decidere con T001d)

## IN ATTESA DI ISTRUZIONE
Non ho iniziato T005. Nessun push, nessuna licenza, nessun repository.
