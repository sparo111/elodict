# Architettura: Elodict

Aggiornata il 2026-11-08 sul codice com'è oggi (il piano iniziale è nella cronologia di git). Per la mappa dei file e le convenzioni vedi `RIEPILOGO.md`.

## 0. L'idea in parole semplici
Un sito web statico: solo file, **nessun server nostro**. Tutto gira nel browser dell'utente: ascolta il microfono, scrive il testo in un foglio A4, applica i comandi vocali, salva il documento nel browser ed esporta i file. Costo di gestione: zero.

## 1. Stack (com'è davvero)
| livello | scelta | perché |
| --- | --- | --- |
| App | **Vite + React 18 + TypeScript** | sito statico semplice; niente server da gestire |
| Stile | **Tailwind 3** + variabili CSS dai token (`replica/design/tokens.*`) | colori e misure in un solo posto, mai valori sparsi |
| Editor | **TipTap 2** (ProseMirror) + sottolineato | testo ricco, comandi programmabili, gratuito |
| Fogli A4 | estensione nostra `src/editor/PageLayout.ts` | impaginazione a fogli con spazi invisibili, senza toccare il documento |
| Ascolto (1) | **Web Speech API** del browser | gratis, veloce; serve internet; su Chrome l'audio passa da Google |
| Ascolto (2) | **Whisper offline** via `@huggingface/transformers` 3.8 + onnxruntime-web (solo CPU/WebAssembly), in un Web Worker | l'audio non lascia il dispositivo; funziona anche su Firefox; modelli da 40 e 80 MB |
| Dati | **IndexedDB** tramite **Dexie** | «database» nel browser, nessun server |
| Esporta | **docx** (Word), **jsPDF** (PDF), codice nostro per .md / .txt / .html | tutto nel browser; Word e PDF in A4 con margini 2,54 cm |
| Email | `mailto:` + Web Share API con file | gratis; l'allegato dal server è stato rimandato per scelta |
| Interfaccia in 4 lingue | **`src/i18n.ts` scritto a mano** (stesse chiavi per IT/EN/FR/ES) | più leggero di i18next; TypeScript obbliga a tradurre ogni chiave |
| Icone / font | Lucide; Inter e Source Serif 4 (self-hosted con fontsource) | aperti, nessuna richiesta a siti esterni |
| Bandiere | SVG disegnati a mano (`Flags.tsx`) | su Windows le emoji-bandiera appaiono come lettere |
| Test | **Vitest** (logica) + **Playwright** (browser, computer e telefono) + **axe** (accessibilità) | 111 + 338 esecuzioni |
| Hosting | da scegliere: statico con HTTPS (il microfono lo richiede) | non ancora pubblicato |

Non servono: login, pagamenti, Postgres, provider di email, lavori in background.

## 2. Dati (nel browser, non SQL)
La forma dei dati è in **`src/store/db.ts`** (database Dexie `elodict`) e **`src/store/backup.ts`** (copia di sicurezza). Non c'è più un file di schema separato.

- `documents` (indice su `updatedAt`): `id`, `title`, `content` (JSON di TipTap), `language`, `createdAt`, `updatedAt`. Oggi si salva **solo l'ultimo documento**.
- `settings` (una riga, `id: "main"`): `dictationLanguage`, `uiLanguage`, `cleanFillers`, `cleanRepeats`, `autoPeriod`, `engine` (`browser` | `offline`), `whisperModel` (`tiny` | `base`), `dictionary` (voci «come lo sente → come lo vuoi»).
- `localStorage`: solo i flag `elodict-model-tiny|base` (modello offline già scaricato).
- Copia di sicurezza: un file JSON `{ app: "elodict", version: 1, documents, settings }`, controllato campo per campo prima di importare (200 documenti e 20 MB al massimo).
- I comandi vocali **non** sono nel database: sono file TypeScript per lingua in `src/commands/`.

Regola d'accesso: i dati stanno solo nel browser dell'utente; non servono permessi né utenti.

## 3. Come scorre una frase detta
```
microfono → motore (browser | Whisper) → testo finale
  → stripFillers / dedupeRepeats            (src/text/clean.ts)
  → parseTranscript: tokenize + dizionario + comandi con numeri
                                            (src/commands/parser.ts, syntax.ts)
  → passi: «scrivi» oppure «agisci» (cancella, formatta, seleziona, elenco, pausa, lingua, aiuto)
  → App.applyTranscript → editor TipTap
  → PageLayout aggiorna i fogli  ·  Dexie salva  ·  l'esportazione legge il documento (src/export/blocks.ts)
```

## 4. Moduli
| modulo | cosa fa |
| --- | --- |
| `speech/recognizer.ts` | motore del browser: avvia/ferma, riavvio automatico dopo le pause, errori del microfono |
| `speech/whisper.ts`, `whisper.worker.ts` | motore offline: microfono (AudioWorklet), modello in un lavoratore, download e cache del modello |
| `speech/segmenter.ts` | taglia il flusso in frasi dalle pause (700 ms), scarta il rumore e le frasi «inventate» sul silenzio |
| `speech/engine.ts` | sceglie fra i due motori |
| `commands/*` | tipi di azione, comandi per lingua, parser, comandi con numeri e parole libere |
| `text/*` | pulizia del testo, dizionario personale, intervalli per cancella/seleziona |
| `editor/PageLayout.ts` | calcolo puro `planPages` + estensione ProseMirror che inserisce gli spazi di pagina |
| `components/*` | foglio (`Paper`), barra, bandierine, finestre (impostazioni, aiuto, esporta, invia), prova del microfono, sezione offline |
| `store/*` | salvataggio e copia di sicurezza |
| `export/*` | documento → blocchi → .txt/.md/.html/.docx/.pdf; «Salva con nome» |

## 5. Le parti che mordono (e cosa si è deciso)
1. **Il browser e il riconoscimento vocale.** Il motore del browser non c'è su Firefox e su Chrome manda l'audio a Google: per questo esiste il motore offline. Il motore del browser non permette di scegliere il microfono.
2. **Whisper offline.** Il modello non lavora a flusso: il testo arriva a fine frase. Il modello piccolo sbaglia più spesso in italiano; di partenza si usa quello medio. La prima volta c'è un download di 40 o 80 MB. I file del motore (22 MB) stanno in `public/ort`, copiati da `scripts/copy-ort.mjs`.
3. **Il foglio A4.** Si misura ogni riga e si inseriscono spazi invisibili per portare la riga successiva sul foglio dopo, anche a metà paragrafo. Trappole note: le misure vanno convertite dallo zoom prima di essere confrontate; l'inizio di ogni riga si trova con `posAtDOM`, non con le coordinate dello schermo.
4. **Comando o testo?** «punto» può essere una parola. Scelta: le frasi di comando valgono sempre; una frase di comando va detta intera. Nei comandi con parole libere («cancella da X a Y») la parte finale è tutto il resto della frase.
5. **Comandi di modifica in IT/FR/ES.** L'originale li ha solo in inglese: le parole sono nostre; lo spagnolo va fatto rivedere da un madrelingua.
6. **Email.** `mailto:` non può allegare file e ha un limite di lunghezza (~1800 caratteri): sopra il limite l'app lo dice e porta a Esporta o Condividi.
7. **Dati solo nel browser.** Se l'utente cancella i dati del sito, spariscono: per questo c'è la copia di sicurezza e un promemoria sempre visibile.
8. **React in sviluppo avvia gli effetti due volte:** il caricamento iniziale è protetto (`hydratedFor`).

## 6. Stato della costruzione
| tappa | contenuto | stato |
| --- | --- | --- |
| M1 | editor, tasto Detta, comandi base in italiano, esporta .txt | fatta |
| M2 | 4 lingue, salvataggio, esportazioni, email, impostazioni, aiuto | fatta |
| M2c-e | cancella N, formattazione e simboli a voce, pulizia, dizionario, pausa, copia di sicurezza, cambio lingua, prova del microfono | fatte |
| M3 | selezione, maiuscolo/minuscolo, elenchi, «mostra comandi», punto automatico | fatta |
| M4 | Whisper offline nel browser | fatta |
| M5 | foglio A4, a capo, zoom, bandierine | fatta |
| dopo | scelta del microfono, trascrizione di un file audio, cronologia dei documenti, pubblicazione | da fare |

## 7. Rischi principali oggi
1. **Nessuna voce umana vera provata** (solo riconoscimento finto, microfono finto e voci di sintesi).
2. **Marchio non verificato**: il nome Elodict è provvisorio.
3. **Documenti molto lunghi**: il calcolo dei fogli rilegge tutte le parole a ogni modifica.

## 8. Dimensione
Circa 4.170 righe di codice dell'app (TypeScript e React) in `src/`, 740 righe di prove sulla logica accanto al codice e 1.860 di prove nel browser in `e2e/`; nessun costo mensile di base.
