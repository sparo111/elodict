# Componenti di mia-dictate

Icone: **Lucide** (open source). Font: **Inter** (interfaccia) e **Source Serif 4** (testo del documento), entrambi open. Nessun asset Microsoft. Tutti i testi sono scritti da noi, in 4 lingue (i18next). Base accessibile consigliata: **Radix UI** per menu, dialog, switch, toast.

Stati comuni a tutto: `focus-visible` = anello 2px colore accent con distanza 2px; `disabled` = opacità ridotta + cursore non consentito + `aria-disabled`; nessun significato affidato al solo colore (sempre anche icona o testo).

---

**DictateButton** (il pulsante principale, S02)
- varianti: `pill` grande (desktop), `fab` tondo in basso (mobile)
- stati: spento (sfondo accent, icona microfono, testo "Detta"), **in ascolto** (sfondo recording, icona stop, puntino che pulsa; con riduzione-movimento il puntino resta fermo), in pausa (contorno accent, icona pausa), disattivato (documento in sola lettura / browser non supportato), caricamento (richiesta permesso microfono), errore
- token: accent / on-accent / recording, radius pill, altezza 48px (mobile 56px)
- a11y: vero `<button>`, `aria-pressed` = in ascolto, annuncio vocale "Dettatura avviata/fermata" (`aria-live=polite`), scorciatoia tastiera mostrata nel tooltip
- usato in: S02, S03, S08

**ListeningIndicator** (S02/S03)
- stati: ascolto attivo (onda a 3 barre animate), pausa (barre ferme), muto (nessun suono rilevato per alcuni secondi: testo "Non ti sento")
- a11y: testo visibile oltre all'animazione

**Editor** (S01)
- larghezza massima 760px, font document 18/30, margini 24px (mobile 16px)
- stati: vuoto (testo guida "Premi Detta e inizia a parlare" + 1 riga di consigli), con testo, sola lettura, testo provvisorio (grigio muted, sottolineatura tratteggiata) che diventa definitivo
- a11y: `role=textbox` multilinea, `aria-label`, tastiera completa (TipTap)

**Toolbar** (S01)
- gruppi: annulla/ripeti, formato (grassetto, corsivo, sottolineato), elenchi, Esporta, Invia
- pulsante icona 40x40, `aria-label` sempre presente + tooltip; stato attivo = sfondo accent-soft

**Button** (generico)
- varianti: primary, secondary, ghost, danger; taglie sm 32 / md 40 / lg 48
- stati: default, hover, active, focus-visible, disabled, loading (mantiene l'etichetta per lettori di schermo)
- token: radius md, font sm/600

**Select / menu a tendina** (lingua, microfono; S04)
- Radix Select; mostra la lingua scritta nella sua lingua ("Italiano", "Français", "Español", "English")
- stati: chiuso, aperto, disattivato; lingue con riconoscimento meno preciso: nota sotto la voce

**Switch** (punteggiatura automatica, filtro parolacce; S04)
- stati on/off, disattivato (es. punteggiatura auto non disponibile per la lingua, con spiegazione)
- a11y: `role=switch`, etichetta cliccabile

**SettingsPanel** (S04)
- su desktop pannello laterale, su mobile pagina intera; chiusura con Esc

**CommandHelpPanel** (S05)
- elenco cercabile per categoria (punteggiatura, modifica, formato...) nella lingua scelta; aperto da pulsante o dal comando vocale "mostra comandi"
- stati: aperto, chiuso, ricerca senza risultati
- a11y: dialog con focus gestito, Esc per chiudere

**Banner / MessageBar** (errori, S06, e avviso browser)
- varianti: errore (danger), avviso (warning/warning-soft), info (accent-soft)
- messaggi pronti: microfono bloccato (come sbloccarlo), microfono non trovato, "Non ti sento", browser non supportato (suggerisce Chrome/Edge/Safari), nessuna connessione
- a11y: `role=alert` per gli errori, azione chiara ("Riprova")

**ExportMenu** (nuovo)
- voci: Word (.docx), PDF, Markdown (.md), Testo (.txt), HTML
- stati: chiuso, aperto, generazione in corso (loading), fatto (toast "File scaricato")

**ShareEmailDialog** (nuovo)
- campi: destinatario (facoltativo), oggetto (precompilato dal titolo), anteprima testo; pulsanti "Apri la posta" (mailto) e "Condividi file" (solo dove supportato)
- stato testo troppo lungo: avviso "Il testo è troppo lungo per l'email: scarica il file e allegalo" + pulsante Esporta
- a11y: dialog con focus intrappolato

**DocumentList** (nuovo)
- riga: titolo, data, lingua; azioni apri / rinomina / elimina (con conferma)
- stati: vuoto ("Nessun documento ancora"), con elementi, caricamento

**Toast**
- varianti: successo, errore; scompare dopo 5s ma resta se il mouse è sopra; `aria-live`

**EmptyState / avviso privacy**
- testo breve su dove vengono salvati i documenti (nel tuo browser) e che su Chrome l'audio passa da Google
