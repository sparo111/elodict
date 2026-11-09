# Elodict — riepilogo del progetto (per chi lo legge per la prima volta)

> Scritto il 2026-11-08 leggendo il repository così com'è (branch `master`, ultimo commit `55aded0`).
> Il documento è pensato per essere dato a Claude.ai (o a una persona) che non ha visto il lavoro fatto.
> I documenti della cartella `replica/` sono stati riallineati al codice il 2026-11-08 (vedi sezione 14). In caso di dubbio **il codice e questo file vincono**.

## 0. In breve (English, for Claude.ai)

**Elodict** (working name; the folder is still called `mia-dictate`) is a **free, no-install, no-account web app for dictation**: you press a button, speak, and text appears in a **real A4 page editor** (21×29.7 cm sheets, margins, page numbers, text wraps at line end and flows onto the next sheet). It supports **Italian, English, French, Spanish** for both the interface and voice commands (punctuation, delete, format, select, lists, language switch…). Speech recognition has two engines: the **browser's Web Speech API** (fast, needs internet, Chrome sends audio to Google) or **offline Whisper running in the browser** (Transformers.js, audio never leaves the device). Documents are stored locally (IndexedDB), exportable to **.docx, .pdf, .md, .txt, .html**, shareable by email (mailto + Web Share), with backup/restore. It is a **clean-room functional rebuild of Microsoft Word's "Dictate"** (no Microsoft code, assets, colours or copy), built with Vite + React + TypeScript + TipTap + Tailwind. There is **no backend**. Tests: 111 unit (Vitest) + 338 browser (Playwright, desktop + 390 px phone; 333 pass, 5 skipped on purpose). The user is an Italian beginner who wants simple explanations in Italian.

---

## 1. Chi è l'utente e come si lavora con lui

- Parla **italiano**, è **alle prime armi**: vuole spiegazioni semplici, senza gergo, e che gli si dica sempre cosa è verificato e cosa no.
- Scrive in modo diretto e a volte in maiuscolo; le sue richieste sono spesso **correzioni di rotta** dopo aver provato l'app (esempio: «il foglio deve essere un A4», «le bandierine vicino al nome»). Ogni richiesta va presa alla lettera e provata.
- **Non ha un microfono.** Per questo l'app ha la casella «Prova senza microfono» e tutte le prove usano un microfono finto o voci di sintesi. **La voce umana vera non è mai stata provata.**
- Preferisce che si faccia il lavoro invece di chiedere: ha detto «procedi» più volte. Va avvisato apertamente quando una scelta sua ha un problema (è successo con il nome «Voxia»).
- Lavora su **Windows 11** (PowerShell + Git Bash). Alcune cose cambiano per questo: vedi sezione 13.

## 2. Da dove nasce il progetto

Il lavoro è stato guidato dal pacchetto di competenze **replica-skill** di Claude Code, che ricostruisce *le funzioni e l'esperienza d'uso* di un'app, **senza copiare nulla** («clean-room»): niente codice, colori, loghi, testi né font dell'originale.

- **App studiata:** la funzione **Dictate** di Microsoft 365 (Word). Fonti: solo pagine pubbliche di aiuto (`support.microsoft.com`). Non ho usato l'app originale né un account Microsoft.
- **Fasi eseguite:** recon → architettura → design → costruzione → test → confronto di parità → ricerca sugli utenti → marchio (parziale).
- **Fasi non fatte:** `replica-launch` (pagina di presentazione, prezzi, testi), `replica-deploy` (pubblicazione). `replica-backend` non serve: non c'è server.

## 3. Le decisioni dell'utente (in ordine di arrivo) e perché contano

| decisione | conseguenza nel codice |
| --- | --- |
| Deve funzionare **oltre Word** | editor proprio nel browser, non un componente aggiuntivo |
| **Gratis**, **senza installazione**, **senza account** | sito statico, nessun server, nessun login, nessun pagamento |
| Lingue: **inglese, italiano, francese, spagnolo** | 4 file di comandi (`src/commands/*.ts`) e 4 lingue di interfaccia (`src/i18n.ts`) |
| Salvare in **Word, PDF, Markdown ecc.** e **inviare per email** | esportazioni generate nel browser; email con `mailto:` + menu Condividi (l'allegato dal server è stato rimandato per scelta) |
| «Salva» deve far **scegliere percorso e nome** | `showSaveFilePicker` dove esiste (Chrome/Edge), altrimenti download con il nome scelto |
| Barra con **icone** (grassetto ecc.) e **icona del microfono** | `src/components/Toolbar.tsx` |
| Nome **Voxia** → poi **Elodict** | Voxia scartato per conflitti reali (vedi sez. 11); Elodict è un nome *di lavoro* |
| Il testo deve stare in un **foglio A4** che va **a capo a fine riga e a fine pagina** | `src/editor/PageLayout.ts`, `src/components/Paper.tsx` |
| **Bandierine** accanto al nome che cambiano lingua dei menu | `src/components/Flags.tsx` |

## 4. Cosa fa l'app (visto da chi la usa)

1. **Detta**: tasto grande in basso (o icona nella barra, o `Alt+Maiusc+D`, `Esc` ferma). Il testo compare nel foglio con spazi e maiuscole giusti.
2. **Foglio A4**: più fogli impilati su una «scrivania», numero di pagina «n / N», zoom (Adatta/75/100/125/150 %). Sul telefono «Adatta» rimpicciolisce il foglio.
3. **Comandi vocali** nelle 4 lingue: punteggiatura, simboli, parentesi e virgolette, a capo/nuovo paragrafo, annulla, «cancella parola/frase», «cancella N parole», «cancella da X a Y», grassetto/corsivo/sottolineato/maiuscolo/minuscolo su «questo / ultima parola / ultima frase», selezione, elenchi, pausa/riprendi/ferma, «mostra comandi», cambio lingua («passa all'inglese»…).
4. **Due motori di ascolto** (Impostazioni → «Chi ascolta la tua voce»): il browser (veloce, serve internet) oppure **Whisper offline** (modello scaricato una volta da huggingface.co, 40 o 80 MB; funziona anche su Firefox; l'audio resta sul dispositivo).
5. **Pulizia del testo** (toglie «ehm/uhm»; facoltativo: parole ripetute; facoltativo: punto dopo ogni pausa) e **dizionario personale** (come lo sente → come lo vuoi; importa/esporta).
6. **Salvataggio automatico** nel browser, **copia di sicurezza** (file JSON) e ripristino.
7. **Esporta**: .docx, .pdf, .md, .txt, .html, con nome file a scelta; **Invia** per email.
8. **Prova del microfono** con barra di livello; avviso se per 10 s non arriva testo.
9. **Bandierine** IT/EN/FR/ES accanto al nome: cambiano menu, testi e lingua della voce insieme. Il menu a tendina della barra permette di dettare in una lingua diversa da quella dei menu.
10. **Casella «Prova senza microfono»**: si scrive una frase come la si direbbe e passa dagli stessi comandi (serve all'utente senza microfono e a tutti i test).

## 5. Come si avvia, si prova, si pubblica

```bash
npm install
npm run dev          # apre il sito (di solito http://localhost:5173); prima copia i file di Whisper in public/ort
npm test             # 188 prove sulla logica (Vitest), pochi secondi
npm run coverage     # le stesse prove con la copertura; FALLISCE se la logica pura scende sotto: righe 90 %, rami 80 % (cartella per cartella, vedi vite.config.ts)
npm run test:e2e     # 475 prove nel browser (Playwright, Chromium); avvia da solo il sito di sviluppo (porta 5199) e due copie costruite (5200 radice, 5201 sotto /elodict/)
npm run build        # controlla i tipi e crea la cartella dist/
```

- `npx playwright install chromium` la prima volta.
- Le prove con **Whisper vero** (`e2e/f08-offline-whisper.spec.ts`) hanno bisogno di **internet** (scaricano il modello) e delle registrazioni di prova: `powershell -ExecutionPolicy Bypass -File e2e/make-fixtures.ps1` (usa le voci di sintesi di Windows Elsa e Zira; i file finiscono in `e2e/fixtures/`, ignorata da git). Se mancano, quelle prove si **saltano da sole**.
- Pubblicazione: **fatta** il 2026-11-08 su <https://sparo111.github.io/elodict/> (repository pubblico <https://github.com/sparo111/elodict>, ramo `main`, Pages con sorgente «GitHub Actions»). `.github/workflows/deploy.yml` a ogni push su `main` costruisce l'app con `VITE_BASE=/<nome-repo>/`, lancia le prove sulla logica **con le soglie di copertura**, controlla che nella build non ci siano gli agganci per le prove (`npm run check:dist`) e la pubblica su **GitHub Pages** (gratis, con HTTPS) a ogni aggiornamento del ramo principale; l'indirizzo sotto `/<nome-repo>/` arriva dalla variabile `VITE_BASE`. Non servono COOP/COEP: il motore di Whisper gira con un solo filo (`numThreads = 1`), quindi basta un hosting statico semplice. In Git Bash, per costruire a mano per `/elodict/` serve `MSYS_NO_PATHCONV=1` (altrimenti Git Bash cambia la base in un percorso di Windows: la build si ferma con un messaggio). Prove sul sito pubblicato: `SITE_URL=https://sparo111.github.io/elodict/ npx playwright test --project=sito-pubblicato`. La **storia di git è stata riscritta prima della prima pubblicazione** (tolti i testi originali delle recensioni e un percorso personale): i codici dei commit nei documenti sono quelli nuovi; una copia della storia di prima è nel file `elodict-prima-della-riscrittura.bundle` (fuori dal repository). Il tag `v-prima-di-T004` indica la versione dell'app prima dell'elenco dei documenti (serve alla prova `npm run test:migrazione`).
- **Installazione**: l'app è una «PWA» fatta con `vite-plugin-pwa` (`registerType: 'prompt'`). Le prove vere del «service worker» usano la copia costruita (`npm run build:pwa-test`, cartella `dist-pwa`), non il sito di sviluppo. I file pesanti del motore (`public/ort`, ~22 MB) non sono nella copia iniziale: si tengono solo dopo il primo uso (`elodict-motore`). I pesi di Whisper li tiene già Transformers.js nella sua memoria.
- `npm run make-icons` rigenera le icone (192, 512, maskable, iPhone 180, scheda 32 e 48) dal sorgente `design/icona-elodict.png` (1254x1254, fuori da `public/`: non va nel sito). Il disegno sta già dentro il cerchio dell'80%, quindi la stessa immagine serve anche per «maskable».

## 6. Architettura in una pagina

```
 microfono ──► MOTORE ─────────────────────────────┐
              ├─ browser: Web Speech API  (src/speech/recognizer.ts)
              └─ offline: Whisper         (src/speech/whisper.ts + whisper.worker.ts + segmenter.ts)
                                                    │  frasi finali (testo)
                                                    ▼
   stripFillers / dedupeRepeats          (src/text/clean.ts)
   parseTranscript → tokenize + dizionario + comandi con numeri  (src/commands/parser.ts, syntax.ts)
                                                    │  passi: "scrivi questo" oppure "agisci" (cancella, formatta, seleziona, elenco, pausa, lingua…)
                                                    ▼
   app/applyTranscript.ts  ──►  editor TipTap (ProseMirror)
                                                    │
                    ┌───────────────────────────────┼─────────────────────────────┐
                    ▼                               ▼                             ▼
        PageLayout (fogli A4)           salvataggio  Dexie/IndexedDB      esportazione (blocks → docx/pdf/md/txt/html)
        solo decorazioni,               (src/store/db.ts, backup.ts)      (src/export/*)
        non entrano nel documento
```

**Principi che tengono insieme il progetto**
- **Nessun server.** Tutto nel browser. Cosa esce dal dispositivo: l'audio verso il servizio vocale del browser (Google, su Chrome) solo con il motore «browser»; il download dei pesi di Whisper da `huggingface.co`. Il testo non esce mai.
- **I comandi sono dati, non codice sparso**: ogni lingua ha un elenco `{ frasi, azione }`. Aggiungere un comando = una riga in 4 file + una voce nell'aiuto (`describe()` in `components/dialogs/HelpDialog.tsx`) + una prova.
- **Passo per passo**: una frase detta si scompone in «passi»; ogni pezzo viene eseguito da solo, così un comando che non può agire (es. «cancella» su documento vuoto) non fa perdere il resto (difetto BUG-001).
- **I fogli A4 sono solo decorazioni** (spazi invisibili): il documento resta una colonna sola, quindi esportare non porta mai spazi di impaginazione.
- **Tutto in 4 lingue con le stesse chiavi**: `src/i18n.ts` ha un oggetto per lingua con tipo `Strings` comune; se si aggiunge una chiave a una lingua, TypeScript obbliga a metterla nelle altre.

## 7. Mappa dei file (solo quelli tracciati da git)

**Installazione e primo avvio (nuovi)**

| file | cosa fa |
| --- | --- |
| `src/install/detect.ts` | funzione pura: sceglie il caso (un clic / iPhone / Firefox / già installata / menu) |
| `src/install/store.ts`, `Install.tsx` | cattura l'invito del programma; pulsante, avviso grande, istruzioni con disegni |
| `src/onboarding/*` | primo avvio in 3 schermate (lingua, microfono, come ascoltare) con avanzamento e tempo stimato |
| `src/pwa/basePath.ts` | indirizzi del motore vocale che tengono conto della sottocartella |
| `src/pwa/useAppUpdate.ts`, `UpdateBanner.tsx` | avviso «nuova versione»; salva il documento prima di ricaricare |
| `public/installa.html` | pagina da stampare in A4, 4 lingue |
| `scripts/make-icons.mjs`, `design/icona-elodict.png`, `public/icons/` | icone 192, 512, maskable, iPhone, scheda del browser |
| `.github/workflows/deploy.yml` | pubblicazione su GitHub Pages |

**Codice dell'app — `src/`**

| file | cosa fa |
| --- | --- |
| `App.tsx` (~210 righe) | la regia: collega i moduli di `app/` e disegna la pagina |
| `app/` | `applyTranscript.ts` (applica una frase all'editor: parole, punteggiatura, comandi), `useSettings.ts` (impostazioni: lettura, scelte, salvataggio; protezione BUG-005), `useDocumentStore.ts` (salvataggio automatico, apertura di un altro documento, ripresa dell'ultimo; controlla che il database si apra), `editorSwap.ts` (mette un altro documento nell'editor e azzera «annulla»), `useDictation.ts` (microfono, pausa, scorciatoie), `useBackupActions.ts`, `useToast.ts`; schermate: `Header.tsx`, `Notices.tsx`, `TryBox.tsx`, `TalkBar.tsx`, `AppDialogs.tsx` |
| `i18n.ts` | tutti i testi in 4 lingue |
| `main.tsx`, `index.css` | avvio, stile dei fogli A4 e dell'editor |
| `commands/` | `types.ts` (tipi di azione), `it/en/fr/es.ts` (comandi per lingua), `parser.ts` (da frase a passi), `syntax.ts` («cancella 3 parole», «da X a Y»), `format.ts` (genera i comandi di formattazione), `index.ts` (elenco lingue, codici voce) |
| `audio/` | `devices.ts` (elenco dei microfoni e apertura di quello scelto; se è scollegato ripiega sul predefinito e lo dice), `useMics.ts` (elenco che si aggiorna da solo) |
| `speech/` | `recognizer.ts` (motore del browser, riavvio automatico), `whisper.ts` (motore offline: microfono + modello), `whisper.worker.ts` (il modello gira qui), `segmenter.ts` (taglia le frasi dalle pause, pulisce le frasi «inventate»), `engine.ts` (sceglie tra i due) |
| `editor/PageLayout.ts`, `editor/measure.ts` | `PageLayout` inserisce gli spazi fra i fogli; **`planPages`** è una funzione pura provata a parte. `measure.ts` misura le righe **un blocco alla volta e ricorda i blocchi non cambiati** (`LineCache`): dopo una modifica si rimisura solo il blocco toccato |
| `components/` | `Paper.tsx` (fogli e zoom), `Toolbar.tsx`, `Flags.tsx` (bandierine in SVG), `dialogs/` (`SettingsDialog`, `HelpDialog`, `ExportDialog`, `SendDialog`), `OfflineSection.tsx`, `MicTest.tsx` (scelta e prova del microfono), `Modal.tsx` (usa l'elemento nativo `<dialog>`) |
| `text/` | `clean.ts` (parole riempitive, ripetizioni, dizionario), `edit.ts` (cancella/seleziona intervalli, titolo) |
| `store/` | `db.ts` (Dexie: tabelle `documents` e `settings`, **versione 2**), `migrations.ts` (migrazione 1→2), `documents.ts` (elenco, cestino, rinomina, duplica, elimina), `rawBackup.ts` (copia di emergenza letta «così com'è»), `dbEvents.ts` (cosa succede se un'altra scheda tiene il database), `backup.ts` (controllo, formato e **limiti** della copia di sicurezza) |
| `documents/` | **logica pura dell'elenco**: `plainText.ts` (testo semplice di un documento), `search.ts` (ricerca senza maiuscole/accenti, con pezzetto evidenziato), `trash.ts` (30 giorni), `order.ts` (ordine, copie); `ui/` = schermate (`DocumentsDialog`, `DocumentItem`, `useLibrary`, `DatabaseProblem`, `DatabaseNotice`) |
| `export/` | `blocks.ts` (documento → blocchi → txt/md/html), `build.ts` (docx, pdf, «Salva con nome») |
| `share/email.ts` | `mailto:` e Web Share |

**Prove — `e2e/` (Playwright) e `*.test.ts` accanto al codice (Vitest)**

| file | cosa prova |
| --- | --- |
| `f01-dettatura` | tasto Detta/Ferma con un riconoscimento finto, errori del microfono, browser non supportato |
| `f02-comandi` | comandi nelle 4 lingue, cancella, formatta, simboli |
| `f03-impostazioni-aiuto` | cambio lingua dei menu, aiuto |
| `f05-pulizia-dizionario-pausa` | pulizia, dizionario (anche importa/esporta), pausa, scorciatoie |
| `f06-backup-lingua-microfono` | copia di sicurezza, cambio lingua al volo, prova del microfono, avviso «non arriva testo» |
| `f07-selezione-elenchi-maiuscolo` | selezione, maiuscole, elenchi, «mostra comandi», punto automatico |
| `f08-offline-whisper` | impostazioni offline e **trascrizione vera** con voce di sintesi |
| `f09-gara-impostazioni` | difetto BUG-005 (scelta lingua prima del caricamento) |
| `f10-foglio-a4`, `f11-a-capo-e-bandierine` | misure dei fogli, nessuna parola tocca i margini, a capo, zoom, bandierine |
| `export-email`, `salvataggio-barra-a11y` | esportazioni, email, salvataggio, barra, accessibilità (axe), telefono |
| `helpers.ts` | `FAKE_SPEECH` (finto riconoscimento), `NO_PICKER`, `say()` (scrive nella casella di prova) |
| `make-fixtures.ps1` | crea le registrazioni di sintesi per le prove con Whisper |

**Altro:** `README.md` (pagina breve per chi arriva dal repository), `scripts/copy-ort.mjs` (copia i file di onnxruntime in `public/ort`), `public/favicon.svg` (icona provvisoria: una «E» fatta di barre), `playwright.config.ts` (due progetti: computer 1440×900 e telefono 390×844, sempre Chromium; microfono finto di Chrome), `vite.config.ts` (esclude Transformers.js dalla pre-elaborazione; worker in formato ES), `tailwind.config.ts` + `replica/design/tokens.*` (colori e misure).

**Documenti di lavoro — `replica/`** (non fanno parte dell'app; sono la memoria del progetto)

| file | contenuto | stato |
| --- | --- | --- |
| `recon.md` | studio di Dictate: schermate, flussi, componenti, dati, concorrente «dictate.» | storico, scrittura del 2026-11-08 |
| `features.csv` | **matrice delle funzioni** (originale sì/no, clone sì/no/parziale/skip, priorità) | **aggiornata** |
| `parity.md` | confronto con l'originale a punteggio | **aggiornata** (75,9; obbligatorie 10/10) |
| `build-log.md` | cronologia di tutto ciò che è stato costruito, con ciò che non è verificato | aggiornata (le sezioni superate sono state tolte) |
| `bugs.md` | 5 difetti trovati e corretti, con causa e prova | aggiornata |
| `test-plan.md` | piano di prova: come si esegue, cosa copre ogni file, cosa resta da provare a mano | **aggiornato** (338 + 111 prove) |
| `architecture.md` | architettura com'è oggi: stack, dati, moduli, rischi, stato | **riscritta** (`schema.ts` è stato rimosso: la forma dei dati è in `src/store/db.ts`) |
| `competitors.md` | progetti GitHub simili e idee prese | aggiornata |
| `fixes.md`, `feedback.md` (e `reviews.csv`, **non pubblico**) | cosa dicono gli utenti di Dictate (7 testi) | aggiornati |
| `fixes-recorders.md`, `feedback-recorders.md`, `themes-recorders.json` (e `reviews-recorders.csv`, **non pubblico**) | 600 recensioni di 6 app che registrano | aggiornati |
| `privato/` | i testi originali delle recensioni (`reviews.csv`, `reviews-recorders.csv`): sono di terzi, **non sono nel repository pubblico** (la cartella è in `.gitignore`); restano solo i riassunti e le classifiche | solo sul computer di chi ha lavorato al progetto |
| `brand.md`, `brand.json` | nome, controlli, palette, logo, voce | aggiornati |
| `design/` | token di design, specifiche dei componenti, controllo contrasto (`contrast.py`) | `tokens.*` e `components.md` **aggiornati** |

## 8. Dati e privacy

- **IndexedDB** (Dexie, database `elodict`): tabella `documents` (id, titolo, contenuto JSON di TipTap, lingua, date) e `settings` (una riga: lingue, pulizia, punto automatico, motore, modello, dizionario, primo avvio fatto, microfono scelto). I documenti sono tanti: elenco con ricerca, rinomina, duplica e **cestino di 30 giorni** (`deletedAt`); all'avvio si riapre l'ultimo modificato o aperto (`openedAt`). Un documento è «nuovo» solo quando ci si scrive (non si creano righe vuote). Massimo 200 documenti, come la copia di sicurezza. Il database è alla **versione 2**: la migrazione aggiunge a ogni documento l'ultima apertura e non tocca altro; se non riesce, l'app non cancella niente, avvisa e offre la copia di emergenza (`rawBackup.ts`).
- **localStorage**: solo i flag `elodict-model-tiny|base` (modello offline scaricato).
- **Copia di sicurezza**: JSON `{ app: "elodict", version: 1, documents, settings }`, controllato campo per campo prima di importare (non importa niente a metà). Limiti: 200 documenti, 20 MB.
- Cosa dichiara l'app all'utente: «su Chrome l'audio è elaborato da Google; il testo resta sul dispositivo»; con Whisper offline: «l'audio non lascia il dispositivo».

## 9. Il foglio A4 (la parte più delicata)

- Misure a 96 dpi: foglio **794×1123 px**, margini **96 px**, intervallo fra fogli 24 px (`PAGE` in `PageLayout.ts`).
- Algoritmo: si misura la posizione naturale di ogni riga (senza spazi), `planPages` decide dove un riga non ci sta più e calcola lo spazio che la porta all'inizio del foglio dopo; gli spazi sono widget di ProseMirror (`.page-spacer`) inseriti **a metà paragrafo se serve**. Si rifà a ogni modifica, un frame dopo.
- **Trappole già incontrate** (lasciate qui per non ripeterle): (1) trovare l'inizio di una riga con `posAtCoords` funziona solo per righe visibili: ora si scorre parola per parola con `posAtDOM`; (2) con lo zoom ridotto (telefono) le misure dello schermo e quelle «vere» vanno convertite prima di confrontarle, altrimenti tutte le righe si fondono in una; (3) i file di Whisper in `public/ort` vanno richiesti con **indirizzo completo** (sito incluso) o Vite in sviluppo rifiuta di servirli come moduli.
- Esportazioni: Word e PDF sono A4 con margini 2,54 cm; il PDF ha solo testo, titoli ed elenchi (niente grassetto/corsivo).

## 10. Stato delle funzioni e punteggio

- **Parità con Dictate: 75,9 / 100** (era 43,1 all'inizio); **funzioni obbligatorie 10 su 10**; soglia «pubblicabile» = 80. Si ricalcola con `parity.py` della skill `replica-diff` leggendo `replica/features.csv`.
- Mancano per salire: punteggiatura automatica vera (oggi è una regola semplice), trascrizione di un file audio caricato, selezione «da X a Y» e per paragrafo, emoji/tabelle/commenti a voce.
- Cose nostre non presenti nell'originale (non contano nel punteggio): Whisper offline, copia di sicurezza, esportazioni, email, bandierine, zoom, casella «Prova senza microfono».

## 11. Marchio e nome

- **Voxia** (scelto dall'utente) → **scartato**: 6 app con quel nome nell'App Store USA (anche di trascrizione), tutti i domini principali occupati, oltre 100 progetti GitHub.
- **Elodict** (proposto dall'utente durante il lavoro) → **nome di lavoro**: nessuna app, nessun dominio registrato (.com .app .it .io .eu .net .org .ai .dev .co), niente su GitHub/npm/web. Possibile confusione: «dict» richiama «dictionary».
- **Da fare e mai fatto:** ricerca marchi USPTO / EUIPO / UIBM / WIPO, Google Play, profili social, parere di un avvocato. Non è una verifica legale.
- Alternative che sembravano libere al primo controllo: Dettavox, Scrivoce, Vocalaro.
- Palette viola/indaco originale (`#5b34c9`), 0 errori di leggibilità su 17 coppie; font Inter + Source Serif 4 (aperti). **Nessun colore, logo o testo dell'originale** (il controllo `sweep.py` è pulito). Per cambiare nome: cerca e sostituisci «Elodict»/«elodict» in `src/`, `e2e/`, `index.html`, `public/favicon.svg`, `package.json`, `replica/brand.json` (attenzione: nome del database e marchio dei file di backup cambiano insieme).

## 12. Cosa abbiamo imparato dal mercato

- **Utenti di Dictate (Microsoft):** solo **7 testi** da 3 fonti (campione piccolissimo). Il tema dominante: «sembra che ascolti ma non scrive» (5 su 7) e «si ferma con le pause». → nate la prova del microfono e l'avviso «non arriva testo».
- **6 app che registrano e trascrivono (Otter, Notta, Rev, Whisper Memos, Whisper Notes, Voice Recorder & Audio Editor):** **600 recensioni** dell'App Store USA. Temi: blocchi, prezzo/abbonamenti/addebiti a sorpresa, limiti gratuiti, **registrazioni perse**, lingue/cambio lingua, importare un file. → nate la copia di sicurezza e il cambio lingua al volo; il vantaggio da raccontare è «gratis, senza account, senza limiti».
- **Concorrenti su GitHub** (Sotto, Odicto, stille_post, Murmur…): tutti piccolissimi e recenti, usati come fonte di idee senza copiare codice. Idee prese: pulizia delle parole riempitive, dizionario personale, pausa a voce, scorciatoie, Whisper nel browser. Nessuno è un editor gratuito nel browser con comandi in 4 lingue.
- Limiti della ricerca: Reddit non raggiungibile dallo strumento; G2/Trustpilot non interrogati; i link delle recensioni App Store portano alla pagina dell'app, non alla singola recensione.

## 13. Come lavorare sul repo (convenzioni e insidie)

- **Testi**: sempre in `src/i18n.ts`, mai scritti dentro i componenti; stesse chiavi nelle 4 lingue. Parole nostre, non quelle dell'originale (in inglese il tasto è «Speak», non «Dictate», di proposito).
- **Colori e misure**: solo dai token (`replica/design/tokens.*`, classi Tailwind come `bg-accent`), mai valori esadecimali nei componenti. Dopo ogni cambio di palette: `python replica/design/contrast.py replica/design/tokens.json` deve dare 0 errori.
- **Prove**: selettori per ruolo ed etichetta (`getByRole`), mai per classe CSS. Ogni correzione di un difetto nasce da una prova che prima fallisce (vedi `bugs.md`). Le prove su telefono (390 px) hanno già trovato difetti veri: non saltarle.
- **Windows**: le «emoji bandiera» non si vedono (per questo le bandierine sono SVG); i file con lettere accentate negli script PowerShell vanno scritti con entità (`&#232;`) o salvati con BOM; i percorsi con `/tmp` in Python non funzionano.
- **React in sviluppo avvia gli effetti due volte**: il caricamento iniziale è protetto da `hydratedFor`; non togliere la guardia (difetto BUG-005).
- **Commit**: messaggio in italiano, con riga finale `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Un solo ramo (`master`); non c'è un repository remoto.
- File ignorati da git (rigenerabili): `node_modules/`, `dist/`, `public/ort/`, `e2e/fixtures/`, `test-results/`, `playwright-report/`, `.replica-guida.json` (file del programma di guida, non dell'app).

## 14. Sistemazione dei documenti, e cosa resta

**Fatto il 2026-11-08 (dopo la prima lettura del repository):**
1. `replica/parity.md` rigenerato: **75,9** e **10 funzioni obbligatorie su 10**.
2. `replica/architecture.md` riscritto sul codice di oggi (Whisper offline, foglio A4, `i18n.ts` a mano, nessun `turndown`/`i18next`, nessun file JSON dei comandi).
3. `replica/schema.ts` **rimosso** (non coincideva più con `src/store/db.ts`): ora l'architettura rimanda a quel file.
4. `replica/test-plan.md` riscritto: come si esegue, cosa copre ogni file (169 casi nel browser × 2 schermi = 338 esecuzioni, più 111 prove sulla logica) e l'elenco delle prove a mano.
5. `replica/design/components.md` riscritto (foglio A4, bandierine, zoom, prova del microfono, sezione offline, finestre).
6. `replica/build-log.md`: tolta la sezione «Prossimi passi (M2)» ormai superata; `replica/recon.md` segnato come **documento storico**.
7. **`README.md`** aggiunto alla radice (pagina breve, con rimando a questo file).

**Resta da fare (nessuno di questi punti è un errore, sono scelte rimandate):**
- **La cartella si chiama ancora `mia-dictate`** mentre il prodotto è Elodict (nome di lavoro).
- **Scelta del microfono**: provata con dispositivi **finti** (elenco e richieste simulati, audio del microfono finto di Chrome) e con Whisper vero. Mai provata con due microfoni veri né scollegandone uno davvero. Con «Il browser» a dettare **la scelta non vale**: il riconoscimento del browser non permette di scegliere il microfono (lo dice l'app); non verificato su Chrome vero con più microfoni.
- **Migrazione del database**: provata (1) con un database della versione 1 costruito a mano, (2) con **la vera app di prima** (tag `v-prima-di-T004`, in un `git worktree` a parte) su un profilo vero di Chromium: `npm run test:migrazione`, e (3) con un guasto simulato (`__ELODICT_FAIL_MIGRATION__`, che esiste **solo** nel server di sviluppo e nelle build di prova, mai nella build pubblicata: lo controlla `npm run check:dist`). Due schede aperte: provato con una scheda «ostinata» simulata e con un'altra scheda che chiede una versione più nuova; non provato con due vere versioni dell'app aperte insieme. Non provata: quota piena, browser diversi da Chromium.
- **Cestino**: il conto dei 30 giorni usa l'orologio del dispositivo; provato con date finte nel database.
- **Documenti molto lunghi**: l'impaginazione ora è incrementale (T002). Provata su 50 fogli; oltre non misurato. Il browser rifà comunque il disegno di tutta la pagina a ogni modifica.
- **Nessuna pagina di presentazione** (fase `replica-launch`, T015). L'app è pubblicata (vedi sezione 5).
- **Licenza**: GNU AGPL v3 (`AGPL-3.0-only`), file `LICENSE`, campo `license` di `package.json`. La sezione 13 chiede di offrire il sorgente a chi usa il programma via rete: il collegamento è in fondo a Impostazioni (`src/legal.ts`, un solo indirizzo, `SOURCE_CODE_URL`). Le librerie usate hanno licenze proprie (non verificate una per una per compatibilità con la AGPL).
- `replica/recon.md` e le sezioni 8b/10 restano come registro storico delle decisioni iniziali.

## 15. Cosa NON è verificato (onestà prima di tutto)

- **Nessuna voce umana vera**, né con un microfono vero, né con rumore. Le prove usano un finto riconoscimento, un microfono finto di Chrome e **voci di sintesi** (molto più pulite di una persona).
- **Whisper offline**: provato con voci di sintesi in inglese (perfetto) e italiano (modello medio perfetto; modello piccolo con 1 parola sbagliata). Non provato: Firefox e Safari veri (simulati), computer lenti (il modello medio può metterci secondi). Sul sito pubblicato: provato il motore (modello piccolo) con una voce di sintesi, non con una voce umana.
- **Spagnolo**: i comandi vengono da un riassunto, non da una lettura letterale della pagina di aiuto; serve un madrelingua.
- **File Word aperti in Word vero**: i .docx sono creati e controllati, ma non aperti in Word.
- **Installazione su telefono/computer veri**: provata solo con Chrome automatico (invito simulato, iPhone e Firefox simulati con il loro identificativo). Mai su un iPhone, un Android o un Windows con Edge veri. Il pulsante dell'invito vero dipende da Chrome/Edge.
- **Aggiornamento**: provato con una versione «finta» (file del service worker cambiato a mano), non con una vera pubblicazione online.
- **Documenti lunghissimi** (decine di pagine): il calcolo dei fogli rilegge tutto a ogni modifica, può rallentare.
- **Stampa dal browser** non progettata (si esporta e si stampa il file).
- **Marchio**: vedi sezione 11.

## 16. Prossimi passi possibili

1. Decidere nome definitivo e cartella (sezione 11).
2. **Trascrizione di un file audio** (la scelta del microfono è fatta: T003).
5. `replica-launch` (pagina di presentazione: gratis, senza account, senza limiti, 4 lingue, foglio A4) e `replica-deploy`.
6. **Una persona vera che prova con un microfono vero** e dice cosa non va: è la prova che manca di più.
7. Controlli sul marchio e parere di un avvocato prima di spendere soldi sul nome.
