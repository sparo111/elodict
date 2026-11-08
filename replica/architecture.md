# Architettura: mia-dictate

Data: 2026-11-08. Si basa su `replica/recon.md` e `replica/features.csv`.

## 0. L'idea in parole semplici
Un sito web statico (solo file, niente server nostro). Tutto gira nel browser dell'utente: ascolta il microfono, scrive il testo, applica i comandi vocali, salva il documento nel browser ed esporta i file. Costo di gestione: zero.

## 1. Stack (una riga di motivazione per scelta)
| livello | scelta | perché |
| --- | --- | --- |
| App web | **Vite + React + TypeScript** | sito statico semplice; Next.js servirebbe solo se avessimo un server, e non l'abbiamo |
| Stile | **Tailwind** (colori da replica-design) | veloce, coerente |
| Editor di testo | **TipTap** (basato su ProseMirror) | testo ricco (grassetto, elenchi, tabelle) e comandi programmabili, gratuito |
| Riconoscimento vocale | **Web Speech API** del browser | gratis, nessun account; limiti in sezione 4 |
| Dati | **IndexedDB** tramite **Dexie** | "database" dentro il browser, nessun server |
| Esporta .docx | libreria **docx** | genera Word nel browser |
| Esporta .pdf | **jsPDF** (o stampa in PDF del browser come piano B) | nel browser |
| Esporta .md | **turndown** (HTML -> Markdown) | nel browser |
| Esporta .txt / .html | codice nostro, banale | |
| Email | `mailto:` + **Web Share API** (con file) | gratis; allegato da server rimandato (deciso) |
| Lingue interfaccia | **i18next** (EN IT FR ES) | testi dell'app tradotti |
| Installabile (opzionale) | **PWA** | si usa dal link, installabile solo se l'utente vuole |
| Hosting | **Cloudflare Pages** (o Netlify/Vercel) | gratis, HTTPS incluso (il microfono lo richiede) |
| Test | Vitest (logica) + Playwright (flussi) | |

Niente: auth, Stripe, Postgres, email provider, job in background. Non servono.

## 2. "Schema" dei dati (nel browser, non SQL)
Non c'è un database server, quindi niente `schema.sql`. Lo schema è in `replica/schema.ts` (tipi + tabelle Dexie). Regola d'accesso: i dati stanno solo nel browser dell'utente, quindi nessun altro li può leggere; non servono permessi.

Tabelle IndexedDB:
- `documents`: id, title, content (JSON TipTap), language, createdAt, updatedAt. Indice su updatedAt.
- `settings` (una riga): dictationLanguage, uiLanguage, microphoneId, autoPunctuation, profanityFilter, lastDocumentId.
- Il dizionario comandi **non** è nel database: sono file `commands/{en,it,fr,es}.json` dentro l'app.

Struttura di un comando (file dati):
```
{ "phrase": ["punto interrogativo","punto di domanda"], "category": "punctuation",
  "action": { "type": "insertText", "text": "?" } }
```
Azioni: insertText, newLine, newParagraph, undo, deleteLast(unit,n), select(unit), format(mark), list(type), pause, resume, stop, showHelp.

Vincoli duri: salvataggio automatico con debounce (non perdere testo se si chiude la scheda); limite spazio browser (~50 MB+ ok per testo).

## 3. "API" (nessun server: moduli interni e rotte dell'app)
Rotte dell'app (pagine):
| rotta | schermata | flusso |
| --- | --- | --- |
| `/` | editor + pulsante Dictate (S01-S03) | F01, F02, F05 |
| `/` pannello impostazioni | S04 | F03 |
| `/` pannello aiuto comandi | S05 | F04 |
| `/documents` | elenco documenti salvati | nuovo (non in recon) |

Moduli interni (il vero "backend", ma nel browser):
| modulo | cosa fa |
| --- | --- |
| `speech/recognizer` | avvia/ferma/pausa la Web Speech API, riavvio automatico, errori mic (S06) |
| `commands/parser` | per ogni frase finale: è un comando o testo? applica azione |
| `commands/dictionary` | carica `commands/<lingua>.json` |
| `text/postprocess` | maiuscole, spazi, punteggiatura per lingua (es. francese: spazio prima di `: ; ? !`; spagnolo: `¿ ¡`) |
| `export/{docx,pdf,md,txt,html}` | crea il file e lo scarica |
| `share/email` | `mailto:` con oggetto+testo; `navigator.share({files})` se supportato |
| `store/documents` | salvataggio locale automatico |

Webhook e job in background: nessuno. Nessuna chiamata verso API private di Microsoft.

## 4. Le parti che mordono
1. **Browser e riconoscimento vocale.** Chrome/Edge/Safari sì, Firefox no. Su Chrome l'audio va ai server di Google; dichiararlo nella privacy. Serve internet per dettare (niente offline). Sul telefono, Safari iOS ha comportamenti diversi: da testare.
2. **Il riconoscimento si ferma da solo** dopo una pausa o un limite di tempo: serve riavvio automatico, senza duplicare il testo.
3. **Risultati provvisori vs finali.** Mostrare il provvisorio in grigio, applicare i comandi solo sul testo finale.
4. **Comando o testo?** "virgola" può essere una parola. Regola proposta: comando solo se la frase è detta da sola (breve pausa prima e dopo) oppure se corrisponde esattamente. Da testare con voce reale.
5. **Comandi di modifica in IT/FR/ES.** Microsoft li ha solo in inglese: li inventiamo noi (es. "cancella", "annulla", "grassetto"; "efface", "annule", "gras"; "borra", "deshacer", "negrita"). Da rivedere con madrelingua.
6. **Punteggiatura per lingua.** Spazi e virgolette cambiano (« » in FR/IT/ES; ¿ ¡ in spagnolo).
7. **Microfono = solo HTTPS** (l'hosting lo dà) e permesso da concedere.
8. **Email.** `mailto:` ha un limite di lunghezza (circa 2000 caratteri): per testi lunghi si avvisa e si propone export + Condividi. L'allegato con `mailto:` non esiste. Il Condividi con file funziona su molti telefoni, meno sui computer.
9. **Export .docx/.pdf:** il formato deve rispettare titoli, elenchi, grassetto; testare l'apertura vera in Word.
10. **Privacy/GDPR:** i documenti restano nel browser; offrire "cancella tutto". Nessun cookie di tracciamento.
11. **Spazio nel browser:** i dati si possono perdere se l'utente svuota i dati del sito: avvisarlo e suggerire di esportare.

## 5. Ordine di costruzione
**Fetta verticale (M1)** — "detto e scaricato": editor + Dictate + testo in italiano con punto/virgola/a capo + esporta .txt.
- Schermate: S01, S02. Tabelle: documents. Moduli: recognizer, parser minimo, export txt.
- Dimostra che microfono, hosting e riconoscimento funzionano.

**M2 — Must-have**
- Salvataggio automatico, errori microfono (S06), impostazioni lingua (S04, 4 lingue), comandi punteggiatura e annulla/cancella in tutte e 4 le lingue, export .docx .pdf .md, email (mailto + Condividi), avviso browser non supportato, pannello aiuto (S05).

**M3 — Should-have**
- Selezione e formattazione a voce, pausa/ripresa, microfono a scelta, punteggiatura automatica, cambio lingua al volo, elenco documenti.

**M4 — Could-have**
- Simboli/valuta/emoji, tabelle, commenti, parole dubbie con "Ignore", filtro parolacce, PWA, export .html/.rtf, mobile rifinito.

**M5 — Dopo il confronto con gli utenti reali** (replica-entrepreneur): correzioni e idee.

## 6. Rischi principali
1. Qualità e comportamento del riconoscimento vocale nei 4 browser/lingue (non dipende da noi).
2. Distinguere comando da testo senza errori fastidiosi.
3. Email con allegato: limite del `mailto:`; l'invio vero richiederebbe un server (rimandato).

## 7. Dimensione
**S per M1, M per M1+M2+M3.** Nessun costo mensile di base.
