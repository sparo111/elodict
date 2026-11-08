# Componenti di Elodict

Aggiornato il 2026-11-08 sul codice com'è oggi. Valori in `tokens.json` / `tokens.css`; mappatura Tailwind in `tailwind.config.ts`.

Icone: **Lucide** (aperte). Font: **Inter** (interfaccia) e **Source Serif 4** (testo del documento), self-hosted con fontsource. Nessun asset di terzi: le bandiere sono SVG disegnati a mano. Tutti i testi sono in `src/i18n.ts`, in 4 lingue con le stesse chiavi. Le finestre usano l'elemento nativo `<dialog>` (gestisce da solo focus, `Esc` e sfondo), non librerie esterne.

Stati comuni: `focus-visible` = anello 2 px colore accent con distanza 2 px; `disabled` = opacità ridotta + cursore non consentito; nessun significato affidato al solo colore (sempre anche icona o testo).

---

**Intestazione** (`App.tsx`)
- a sinistra: nome dell'app e **Flags**; a destra: Invia, Esporta, Aiuto, Impostazioni (sul telefono solo icone, con `aria-label`); sul telefono la riga va a capo se non ci sta tutto
- usa: testo `lg`, bordo `border`

**Flags** (`components/Flags.tsx`)
- 4 pulsanti con bandiera disegnata (IT, EN, FR, ES), gruppo con nome «Lingua dell'app e della voce»; il nome di ogni pulsante è la lingua scritta nella sua lingua
- stati: normale, attivo (`aria-pressed`, bordo accent + sfondo accent-soft), hover, tastiera
- una scelta cambia insieme lingua dei menu e lingua della voce

**Barra degli strumenti** (`components/Toolbar.tsx`, `role="toolbar"`, sempre in cima mentre si scorre)
- ordine: microfono · menu della lingua della voce · annulla/ripeti · grassetto, corsivo, sottolineato · titolo, elenco puntato, elenco numerato · zoom del foglio
- pulsante icona 40×40, `aria-label` sempre presente + tooltip; stato attivo = sfondo accent-soft e testo accent (`aria-pressed`); non toglie il cursore dal testo (`onMouseDown` annullato)
- sul telefono scorre di lato se non ci sta tutta
- il microfono è accent da fermo, `recording` mentre ascolta (icona quadrato)

**Foglio A4** (`components/Paper.tsx`, `editor/PageLayout.ts`)
- «scrivania» (`desk`) con uno o più fogli bianchi 794×1123 px (A4 a 96 dpi), margini 96 px, intervallo 24 px, numero di pagina «n / N» in basso
- il testo è un'unica colonna; a fine area utile un **spazio invisibile** porta la riga successiva sul foglio dopo (anche a metà paragrafo)
- zoom: Adatta (riduce sul telefono, mai oltre il 100%), 75, 100, 125, 150%; con zoom > Adatta si scorre di lato dentro la scrivania, non nella pagina
- stati: vuoto (segnaposto dentro il foglio), con testo, più fogli
- a11y: fogli e numeri `aria-hidden`; il campo del documento è `role="textbox"` multilinea con il nome nella lingua scelta

**Tasto principale «Detta / Speak / Dicter / Dictar»** (in basso, fisso)
- pill 48 px, accent da fermo, `recording` mentre ascolta (icona quadrato + puntino che pulsa; con «riduci movimento» il puntino resta fermo)
- stati: fermo, avvio, ascolto, pausa (testo + pulsante «Riprendi» nella riga di stato), disattivato (browser non supportato), caricamento del modello («Carico il modello… n%»)
- a11y: vero `<button>`, `aria-pressed`, la riga di stato è `aria-live="polite"`; scorciatoia `Alt+Maiusc+D`

**Testo provvisorio**
- sotto il foglio, corsivo grigio (`muted`), mentre si parla; sparisce quando la frase è finale

**Finestre** (`components/Modal.tsx` + `Dialogs.tsx`)
- larghezza 34 rem al massimo, titolo, tasto Chiudi, clic fuori o `Esc` per chiudere
- **Impostazioni**: lingua della voce, lingua dei menu · pulizia del testo (3 caselle) · dizionario personale (aggiungi, rimuovi, importa/esporta) · «Chi ascolta la tua voce» (browser / offline, modello, scarica, elimina) · prova del microfono · copia di sicurezza
- **Aiuto**: elenco dei comandi della lingua della voce, scorciatoie ed esempi con numeri
- **Esporta**: nome del file + 5 formati (Word, PDF, Markdown, testo, web); dove c'è, apre «Salva con nome»
- **Invia**: oggetto, «Apri la posta con il testo», «Condividi file…» (solo dove supportato), avvisi se il testo è troppo lungo

**Prova del microfono** (`components/MicTest.tsx`)
- tasto Prova/Ferma + barra di livello (`role="meter"`) + nome del microfono; messaggi per bloccato, assente, silenzioso (dopo 3 s); il microfono si spegne chiudendo la finestra

**Sezione offline** (`components/OfflineSection.tsx`)
- due scelte radio (browser / offline), menu del modello, «Scarica il modello» con barra di avanzamento, «Elimina i modelli scaricati», stato (pronto / non ancora scaricato / fallito)

**Banner** (errori e avvisi sopra il foglio)
- errore (`danger`, `role="alert"`) con «Riprova» o «Prova il microfono»; avviso browser non supportato (`warning-soft`); info «ascolto ma non arriva testo» (`accent-soft`, `role="status"`, con «Prova il microfono»)
- messaggi pronti: microfono bloccato (come sbloccarlo), assente, «Non ti sento», nessuna connessione, modello offline non funzionante, browser non supportato

**Casella «Prova senza microfono»** (sotto il foglio, `<details>`)
- campo di testo + «Inserisci»: la frase scritta passa dagli stessi comandi della voce

**Toast**
- messaggio breve in basso al centro (es. «File salvato.»), `role="status"`, sparisce dopo 4 s

**Righe di stato e avvisi** (in fondo)
- «Salvato su questo dispositivo» / «Salvataggio…» / errore · promemoria della copia di sicurezza · avviso privacy che cambia con il motore scelto (browser o offline)

---
**Non esiste (rispetto al piano iniziale):** elenco dei documenti salvati (oggi si salva solo l'ultimo), «sola lettura», evidenziazione delle parole dubbie, tema scuro.
