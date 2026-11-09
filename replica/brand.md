# Marchio: Elodict (nome di lavoro)

Data: 2026-11-08. **Questi sono controlli di prima scrematura, non una verifica legale.** Prima di spendere soldi sul nome (dominio, logo, pubblicazione) serve la ricerca di un avvocato esperto di marchi.

## Il nome, e come ci siamo arrivati
- **Voxia (scelto per primo): scartato.** Trovati conflitti seri:
  - App Store USA: **6 app** con quel nome, tra cui «Voxia Transcribe Audio to Text» e «Voxia: AI Note Taker & Planner» (categoria Productivity: la nostra categoria).
  - Domini .com, .app, .io, .it, .eu, .net, .org, .ai: **tutti registrati o in vendita**.
  - Web: una piattaforma di voce AI chiamata Voxia; su GitHub più di 100 progetti col nome, alcuni di assistenti vocali.
  - Marchio USA «VOXIA» (n. 87947578, Gameloft, classe 9): risulta scaduto, ma non dice nulla sull'Europa.
- **Elodict: nome di lavoro attuale.** Nessun risultato nei controlli sotto. Pronuncia semplice in italiano, francese, spagnolo e inglese. Possibile confusione: «dict» richiama «dictionary» (dizionario), quindi qualcuno potrebbe aspettarsi un'app di dizionario. Non contiene «Dictate», il nome della funzione dell'originale.
- Altri nomi che al primo controllo sembravano liberi (non ancora verificati sul web): **Dettavox, Scrivoce, Vocalaro**.

## Controlli su Elodict (eseguiti il 2026-11-08)
| controllo | esito |
| --- | --- |
| App Store USA, Italia, Francia, Spagna (ricerca "elodict") | nessuna app con questo nome (4 risultati non pertinenti in USA) |
| Domini: .com .app .it .io .eu .net .org .ai .dev .co | **nessun nameserver** su nessuno. Attenzione: è un indizio, non una prova; la disponibilità vera si vede dal registro del dominio al momento dell'acquisto |
| GitHub: repository e utenti | nessuno |
| npm | nome libero (404) |
| Ricerca web "Elodict" | nessun risultato col nome esatto (solo EDICT/ODict, progetti di dizionari non correlati) |
| **Da eseguire** | |
| Marchio USA (tmsearch.uspto.gov, classi 9 e 42) | **da fare** |
| Marchio UE (EUIPO eSearch plus / TMview) | **da fare** |
| Marchio Italia (UIBM) | **da fare** |
| WIPO Global Brand Database | **da fare** |
| Google Play | **da fare** (non interrogato) |
| Profili X, Instagram, TikTok | **da fare** (non controllabili da qui) |
| Ricerca di un avvocato | **da fare prima di investire** |

## Palette
Nuova palette viola/indaco, in un'altra famiglia di colore rispetto al blu dell'originale. Controllo di leggibilità: **0 errori** su 17 coppie (testo su sfondo 17,2:1; bianco su viola 7,6:1; viola su bianco 7,6:1).
| ruolo | colore |
| --- | --- |
| accent (principale) | `#5b34c9` |
| accent-soft | `#ece8fb` |
| bg / surface | `#ffffff` / `#f6f5fb` |
| text / text-muted | `#1b1830` / `#55526b` |
| border / border-input | `#e2dfee` / `#6a6683` |
| recording (solo "sto registrando") | `#d92d20` |
I colori dell'originale (`#0078d4`, `#185abd`, `#2b579a`, `#106ebe`) sono in `brand.json` e il programma di controllo non ne trova.

## Logo: scheda per chi lo disegna
- **Idea in una riga:** una "E" fatta di barre di diversa lunghezza, come un'onda sonora messa di lato: la voce che diventa lettera.
- **Tipo:** simbolo + scritta «Elodict» (scritta in Inter, peso 700).
- **Deve funzionare a** 16 px (icona della scheda) e a 1024 px (icona dell'app).
- **Da consegnare:** SVG; icona 1024×1024 senza trasparenza; set di icone della scheda; immagine social 1200×630.
- **Non deve somigliare all'originale:** niente microfono blu, niente la forma delle icone di Office. Mettere la bozza accanto al logo dell'originale e controllare.
- **Icona attuale (T001g):** `design/icona-elodict.png` (documento verde smeraldo con onde sonore su sfondo azzurro `#A9DDFB`, 1254x1254); sostituisce la bozza viola `public/favicon.svg`, tolta. I colori del manifest (`#5b34c9`, bianco) restano quelli dei token di design.

## Voce
**Tre parole: chiara, calma, onesta.**
| è | non significa |
| --- | --- |
| Chiara | fredda o tecnica |
| Calma | lenta o senza energia |
| Onesta | brusca |

| Sì | No |
| --- | --- |
| «Il microfono è bloccato. Clicca sul lucchetto vicino all'indirizzo e consenti il microfono.» | «Errore: permesso negato (403)» |
| «Salvato su questo dispositivo» | «I dati sono stati persistiti localmente» |
| «Su Chrome l'audio è elaborato da Google. Il testo resta sul tuo dispositivo.» | Non dire niente, o «100% privato» |
| «Non ti sento. Avvicinati al microfono.» | «Input audio non rilevato dall'utente» |
| «Premi «Detta» e inizia a parlare.» | «Dettatura perfetta! Provala ora!!!» |

**Le 10 frasi più viste, controllate contro la guida** (dettatura: placeholder, pulsante, ascolto, avvio, salvato, errore microfono, nessun testo, browser non supportato, privacy, copia di sicurezza). Risultato: erano già scritte in questa voce e non sono state cambiate, tranne in inglese: il pulsante «Dictate» è diventato «Speak», perché «Dictate» è il nome della funzione dell'originale. Il lavoro sulla voce è nelle 4 lingue di `src/i18n.ts`.

## Il controllo dei residui dell'originale
`sweep.py` su tutto il progetto, con i nomi «Microsoft», «Dictate», «Hyper Whisper», «Office 365», i domini e i colori dell'originale: **0 residui nel codice, nei test e nelle pagine**. I 5 punti che il programma segnala sono tutti in `.replica-guida.json`, un file del programma di guida, escluso da git e mai pubblicato.

## Se cambi il nome ancora (lista pronta)
1. Cerca e sostituisci «Elodict» / «elodict» in `src/`, `e2e/`, `index.html`, `public/favicon.svg`, `package.json`, `replica/brand.json`.
2. Il nome del database interno (`src/store/db.ts`) e il marchio dei file di copia di sicurezza (`src/store/backup.ts`) cambiano insieme: le copie vecchie smetteranno di essere accettate.
3. Rifai i controlli del nome e rilancia `sweep.py`.
4. Rilancia i test.

## Cose da non fare
Il nome «Dictate» e «Microsoft» non vanno nel nome, negli annunci, nelle immagini né nella scheda dell'app. Una pagina di confronto con l'originale è una domanda per un avvocato del tuo paese.
