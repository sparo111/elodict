# Piano di evoluzione — roadmap T002–T015

## Istruzioni per Claude Code

1. (Già fatto: questa roadmap è salvata in `replica/roadmap.md`.)
2. **Esegui un solo compito alla volta, nell'ordine indicato.** Per ogni compito:
   - leggi `RIEPILOGO.md` e le sezioni dei documenti `replica/` che ti servono;
   - fai girare i test prima di iniziare e riporta i numeri;
   - scrivi un piano breve, poi esegui;
   - aggiorna `RIEPILOGO.md`, `replica/features.csv`, `replica/build-log.md` e `replica/test-plan.md`, e ricalcola la parità con `parity.py`;
   - produci `AUDIT_TXXX.md` con 4 righe PASS ✅ / FAIL ❌ (FUNZIONALE, SICUREZZA, QUALITÀ, INTEGRAZIONE), poi **GATE COMPLESSIVO** e **IN ATTESA DI ISTRUZIONE**;
   - **non iniziare il compito successivo senza il mio via libera esplicito.**
3. Vincoli validi per **tutti** i compiti:
   - **Installazione facile**: nessun compito può aggiungere passi per chi usa l'app (niente comandi, account, file da scaricare a mano o impostazioni obbligatorie). Se una funzione richiede un download (per esempio un modello), deve partire da un pulsante, con barra di avanzamento, e poi funzionare offline.
   - **Le tre promesse**: gratis e senza limiti; nessun server che riceve audio o testo; **nessuna riscrittura automatica** delle parole dettate (ogni aiuto «intelligente» è facoltativo e mostra la modifica prima di applicarla).
   - Regole del repository (RIEPILOGO §13): testi solo in `src/i18n.ts` nelle 4 lingue; colori solo dai token; test con selettori per ruolo ed etichetta; ogni difetto si corregge partendo da un test che prima fallisce; prove anche sul telefono a 390 px; non togliere la guardia `hydratedFor` (BUG-005).
   - Niente codice nuovo dentro `App.tsx`: solo moduli separati.
   - Dipendenze nuove: chiedimi prima di aggiungerle, spiegando peso e alternativa.
4. Se un compito risulta più grande del previsto, proponi di dividerlo invece di consegnarlo a metà.

---

## Fase 0 — base solida

### T002 — Dividere App.tsx e rendere più veloce l'impaginazione A4
- Dividi `src/App.tsx` (~620 righe) almeno in: applicazione delle frasi all'editor, caricamento e salvataggio delle impostazioni, intestazione e barra. Nessun file deve superare circa 250 righe.
- Rendi incrementale il calcolo dei fogli in `src/editor/PageLayout.ts`: ricalcola solo dal paragrafo modificato in poi.
- **Fatto quando**: tutti i test esistenti sono verdi; c'è un test nuovo con un documento di 50 pagine che misura il tempo di risposta dopo una modifica e lo mantiene sotto una soglia dichiarata (riporta i numeri prima/dopo); `planPages` resta una funzione pura testata.

## Fase 1 — fiducia e uso quotidiano

### T003 — Scelta del microfono
- Elenco dei microfoni (`enumerateDevices`) in Impostazioni e nella prova del microfono; la scelta viene ricordata. Funziona con il motore Whisper; con il motore del browser, spiega con onestà se la scelta non è supportata.
- **Fatto quando**: ci sono test con due dispositivi finti e un dispositivo scollegato (si torna a quello predefinito con un avviso chiaro).

### T004 — Elenco dei documenti con ricerca
- Oggi si salva solo l'ultimo documento. Aggiungi: elenco dei documenti (titolo, data, prime parole), nuovo, apri, rinomina, duplica, elimina con conferma (e un «cestino» per 30 giorni), ricerca nel testo.
- Modifica lo schema Dexie con una migrazione che **non perde** il documento esistente. La copia di sicurezza (`backup.ts`) deve continuare a importare i file della versione 1.
- **Fatto quando**: c'è un test di migrazione da un database vecchio; test di ricerca; test del cestino; i limiti della copia di sicurezza (200 documenti, 20 MB) sono rispettati.

### T005 — «Tieni premuto per parlare»
- Seconda modalità di dettatura: si parla solo mentre si tiene premuto il tasto grande (oppure la barra spaziatrice o la scorciatoia). Utile con rumore e voci intorno. Si sceglie in Impostazioni e resta attiva la modalità attuale «tocca e parla».
- **Fatto quando**: ci sono test per mouse, tocco (telefono) e tastiera; rilasciando il tasto, la frase in corso viene completata e non persa.

### T006 — Parole incerte evidenziate
- Con Whisper, usa la probabilità di ogni parola per sottolineare (in modo leggero e accessibile, non solo con il colore) le parole sotto una soglia. Cliccandole si vedono le alternative, se disponibili, oppure si corregge a mano. La sottolineatura è una **decorazione** come i fogli A4: non entra mai nel documento né nelle esportazioni.
- **Fatto quando**: ci sono test che verificano che le esportazioni non contengano marcatori e test con probabilità finte; la funzione si può disattivare.

## Fase 2 — motore offline veloce

### T007 — Banco di prova dei motori
- Crea `bench/` con uno script che misura **errori per parola (WER)** e **tempo di risposta** su una cartella di registrazioni con il testo corretto accanto. Supporta le registrazioni di sintesi esistenti (`e2e/make-fixtures.ps1`) e **registrazioni vere** che fornirò io o i tester (cartella ignorata da git).
- Confronta: Whisper attuale (WASM), Whisper con WebGPU, Parakeet multilingue con WebGPU (verifica prima nella scheda del modello quali lingue supporta davvero).
- **Fatto quando**: c'è un report `bench/RISULTATI.md` con tabella per lingua e per dispositivo, e una tua raccomandazione separata dai numeri.

### T008 — Motore WebGPU con ripiego automatico
- Solo con i modelli che in T007 hanno migliorato i numeri. Se WebGPU c'è ed è utilizzabile (`requestAdapter()` restituisce un adattatore), usalo; altrimenti torna a WASM senza che l'utente debba fare nulla.
- Valuta se rendere «Privato» la scelta predefinita al primo avvio, se è abbastanza veloce.
- **Fatto quando**: ci sono test del ripiego (WebGPU assente o in errore) e i tempi misurati sono riportati nell'audit.

## Fase 3 — funzioni per le nicchie (professionisti con riservatezza e scuola/DSA)

### T009 — Rilettura a voce e lettura facilitata
- Pulsante «Leggi ad alta voce» (tutto il testo, dalla posizione del cursore, o la selezione) con la sintesi vocale del browser, nella lingua del documento, con velocità regolabile e la parola letta evidenziata.
- «Lettura facilitata»: carattere ad alta leggibilità (solo font aperti), interlinea e spaziatura maggiori, sfondo color crema. Riguarda solo lo schermo, non le esportazioni.
- Comandi vocali «leggi», «leggi frase», «ferma lettura» nelle 4 lingue, più la voce nell'aiuto (`describe()`).
- **Fatto quando**: ci sono test con la sintesi simulata e il contrasto è verificato con `contrast.py`.

### T010 — Vocabolari di settore
- Pacchetti importabili e attivabili (giuridico con latinismi, medico di base, scuola), che si sommano al dizionario personale. Formato JSON documentato; i pacchetti sono file statici nell'app.
- Con Whisper, usa il vocabolario anche come suggerimento iniziale (prompt), se migliora i numeri del banco di prova T007.
- **Fatto quando**: ci sono test di importazione ed esportazione e di conflitto con il dizionario personale (vince quello personale).

### T011 — Modelli di documento e frasi rapide
- Modelli: lettera, verbale, memoria/atto (con intestazione), compito scolastico, appunti. «Nuovo da modello» nell'elenco documenti.
- Frasi rapide: l'utente salva testi ricorrenti (firma, intestazione, formule di chiusura) e li inserisce a voce con «inserisci [nome]».
- **Fatto quando**: ci sono test nelle 4 lingue per il comando «inserisci» e i modelli si esportano correttamente in .docx/.pdf.

### T012 — Trascrizione di un file audio
- «Apri registrazione»: si sceglie un file audio (memo del telefono, registrazione di una riunione) e Whisper lo trascrive in locale nel documento, con barra di avanzamento e possibilità di annullare. I formati sono quelli che il browser sa decodificare: dichiarali onestamente.
- **Fatto quando**: ci sono test con un file di sintesi breve, un file non supportato (messaggio chiaro) e l'annullamento.

### T013 — Punteggiatura automatica migliore
- Sostituisci la regola semplice attuale. Prima prova regole migliori (pause più lunghe, intonazione non disponibile), poi, solo se T007 lo giustifica, la punteggiatura del modello. Mai riscrivere le parole: solo punteggiatura e maiuscole.
- **Fatto quando**: ci sono test su frasi di riferimento nelle 4 lingue, con i numeri prima/dopo.

### T014 — Stampa diretta con i fogli A4
- «Stampa» dal menu: stile di stampa che rispetta foglio, margini e numeri di pagina, senza barre né pulsanti.
- **Fatto quando**: c'è un test Playwright che genera il PDF di stampa e verifica numero di pagine e margini.

## Fase 4 — lancio

### T015 — Pagina di presentazione
- Fase `replica-launch`: pagina semplice (gratis, senza account, senza limiti, la voce resta sul computer, foglio A4, 4 lingue), con il pulsante «Inizia» e il collegamento alla pagina «Come si installa» (T001). Testi nostri, nessun riferimento all'app originale.
- **Prerequisiti, da chiedermi prima di iniziare**: nome definitivo, licenza, nicchia da mettere in primo piano.

---

## Da NON fare per ora (elenco di attesa, chiedimi prima)
- «Sistema il testo» con un modello linguistico locale (solo su richiesta, con modifiche da accettare una per una).
- Riascolto sincronizzato (clic su una parola per risentirla).
- Cronologia delle versioni di un documento.
- Grassetto e corsivo nel PDF, tabelle ed emoji a voce, commenti.
- Estensione del browser per dettare in altri siti.

## Decisioni ancora aperte (le prendo io)
1. Nome: Elodict o un altro (prima serve la ricerca dei marchi).
2. Licenza: MIT o AGPL.
3. Nicchia principale: professionisti con riservatezza oppure scuola/DSA.
4. Tester: 5–10 persone con un microfono vero (servono per T007).
