# Cosa dicono gli utenti di Dictate (Microsoft) — e cosa ne facciamo

Data: 2026-11-08.

## Campione: piccolissimo
**7 testi di utenti reali, da 3 fonti, nessuna valutazione a stelle.** Sono sei messaggi di richiesta aiuto sui forum Microsoft (Q&A e Tech Community) e una vecchia recensione su AlternativeTo (2018).
Con meno di 30 recensioni si può intravedere una direzione, non fare una classifica. E chi scrive su un forum di assistenza ha quasi sempre un problema, quindi il campione pende verso il negativo.

**Non raggiunto o non trovato:**
- Reddit: lo strumento di ricerca non può accedervi, quindi non l'ho letto.
- App Store "dictate. — Voice to Text" (id6759285154): nessuna recensione ancora.
- Dictate di Microsoft non ha una scheda propria su App Store, Google Play, G2 o Trustpilot, e su Product Hunt dice "No reviews yet". G2 e Trustpilot non li ho interrogati.
- Hacker News: la ricerca ufficiale ha dato solo commenti generici sulla dettatura, non su Dictate.
- Ho scartato i siti di "guide per risolvere" e i confronti scritti da aziende che vendono programmi concorrenti: non sono utenti.

Le frasi degli utenti sono materiale di studio: non vanno usate come testimonianze nella tua pagina di presentazione.

## 1. Cosa odiano (cose che l'app fa)
| # | problema | testi | fonti | frasi vere (con link) |
| --- | --- | --- | --- | --- |
| 1 | **Sembra che ascolti ma non scrive, o smette di funzionare** | 5 su 7 | 2 | «I click the Dictate button and the program looks like it's dictating, but nothing appears onscreen.» ([link](https://techcommunity.microsoft.com/discussions/word/word-dictation-not-working/4179227)) · «The microphone acts like it is working like it used to do, but is not.» ([link](https://learn.microsoft.com/en-us/answers/questions/f39a67e8-5951-4b79-96b6-f2a9bf5a9317/word-dictation-not-working-after-update)) |
| 2 | **Si ferma quando fai una pausa / sente cose che non hai detto** | 2 su 7 | 1 | «why MS Word Dictation quits when there is a pause» ([link](https://learn.microsoft.com/en-us/answers/questions/5791408/dictation-function-is-disfunctional)) · «if I pause for too long it will start hearing things that aren't there.» ([link](https://learn.microsoft.com/en-us/answers/questions/5186721/microsoft-word-dictation-glitching)) |
| 3 | **Si rompe dopo un aggiornamento** | 2 su 7 | 1 | «Since being forced to update to Windows 11, my Word dictation does not work.» ([link](https://learn.microsoft.com/en-us/answers/questions/f39a67e8-5951-4b79-96b6-f2a9bf5a9317/word-dictation-not-working-after-update)) |
| 4 | **L'assistenza non lo risolve** | 1 su 7 (sottile) | 1 | «I've been onto Microsoft support five times and nothing has worked.» ([link](https://techcommunity.microsoft.com/discussions/word/word-dictation-not-working/4179227/replies/4512652)) |

Tutti i punti sono **sottili** (meno di 3 testi o una sola fonte, tranne il 1, che ha 2 fonti ma sono entrambe forum Microsoft). Sono un indizio, non una tendenza.

## 2. Cosa manca (richieste di funzioni per nome)
**Nessuna richiesta esplicita trovata.** Le persone non chiedono funzioni nuove: chiedono che quella che c'è funzioni. Una pagina di risposta Microsoft (generata da intelligenza artificiale, non un utente) dice che non esiste un'impostazione per far aspettare più a lungo durante una pausa («The current documentation does not expose any setting to change how long dictation waits during a pause»): è un dato sulla funzione, non una richiesta di utenti.

## 3. Cosa non è risolto (gruppi ignorati)
- **Chi non ha o non vuole pagare Microsoft 365.** Un utente scrive: «I pay for Word (365) because it makes certain promises... like dictation.» ([link](https://learn.microsoft.com/en-us/answers/questions/5791408/dictation-function-is-disfunctional)). Il resto (serve l'abbonamento, funziona solo nelle app Microsoft) viene dalle pagine di aiuto di Microsoft, non da recensioni.
- Ipotesi, **non** da recensioni: i comandi di modifica e formattazione di Dictate esistono solo in inglese (dalla pagina di aiuto Microsoft).

## Piano delle correzioni (dalle prove, e quanto costano)
| # | cosa costruire | taglia | evidenza | stato |
| --- | --- | --- | --- | --- |
| 1 | **Test del microfono con indicatore di livello**: una barra che si muove quando il microfono sente. Così chi vede «ascolta ma non scrive» capisce da solo se è il microfono | S-M | tema 1 (5 testi) | proposto, in `features.csv` |
| 2 | **Avviso se per qualche secondo non arriva nessun testo**, con i controlli da fare (permesso, microfono silenziato, connessione) | S | tema 1 | proposto, in `features.csv` |
| 3 | Non fermarsi alle pause | — | tema 2 | **già fatto**: riavvio automatico, provato nei test (F01-E1) |
| 4 | Non dipendere dagli aggiornamenti di Office/Windows | — | tema 3 | già vero: è un sito indipendente |
| 5 | Provare se compaiono frasi fantasma ("hi", "ok") quando c'è silenzio | S | tema 2 (1 testo) | **da verificare con una voce vera**, non da costruire adesso |

## Come posizionare l'app (3 opzioni, tutte con prove deboli)
1. **«Per chi usa la dettatura per lavoro e non può permettersi che si fermi in silenzio: ti fa vedere se il microfono ti sente, e ti dice cosa fare.»**
   Prove: tema 1, 5 testi su 7, 2 fonti (entrambe forum Microsoft).
2. **«Per chi non ha (o non vuole pagare) Microsoft 365: gratis, nel browser, senza installare niente.»**
   Prove: 1 testo di utente sul pagare l'abbonamento; il resto sono fatti dalle pagine di aiuto Microsoft.
3. **«Per chi parla italiano, francese o spagnolo e vuole comandi vocali anche per correggere e formattare.»**
   Prove: nessuna da utenti; solo il fatto (da pagine Microsoft) che quei comandi esistono solo in inglese.

**Consiglio: la 2 come promessa di base (è vera e controllabile) e la 1 come aggiunta da costruire.** Non cambiare strada per questi 7 testi: servono utenti veri che provino la tua app.

Attenzione: nel nome, negli annunci e nella scheda dell'app non usare il nome «Dictate» né «Microsoft». Una pagina di confronto con l'originale è una domanda da fare a un avvocato del tuo paese.
