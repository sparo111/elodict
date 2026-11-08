# Registro di costruzione

| ID | data | stato | cosa manca | cosa è stato più difficile |
| --- | --- | --- | --- | --- |
| Shell | 2026-11-08 | fatto | rotte multiple (c'è una sola pagina), tema scuro | niente |
| M1 / S01 editor | 2026-11-08 | fatto (base) | autosalvataggio, sola lettura, tabelle/liste | il posizionamento di spazi e maiuscole attorno al cursore |
| M1 / S02 pulsante Detta | 2026-11-08 | fatto (base) | scorciatoia da tastiera, pausa/ripresa | riavvio automatico del microfono |
| S06 errori microfono | 2026-11-08 | fatto | niente | |

## M2 (2026-11-08)
| area | stato | note |
| --- | --- | --- |
| Lingue EN IT FR ES (comandi + interfaccia) | fatto (base) | spagnolo da riassunto Microsoft, da far rivedere a un madrelingua. i18n scritto a mano (`src/i18n.ts`) invece di i18next: più leggero, stesse chiavi per tutte le lingue |
| Impostazioni (lingua parlata, lingua app) | fatto | microfono a scelta, punteggiatura auto, filtro parolacce: M3 |
| Salvataggio automatico | fatto | IndexedDB, solo l'ultimo documento; elenco documenti: M3 |
| Esporta docx/pdf/md/txt/html | fatto | verificato con test automatici (file validi); NON aperto in Word vero. PDF senza grassetto/corsivo |
| Invia per email | fatto | mailto (limite ~1800 caratteri) + Condividi file dove il dispositivo lo permette |
| Aiuto comandi | fatto | solo da pulsante, non a voce |
| Casella "Prova senza microfono" | fatto (extra) | fa passare il testo scritto dagli stessi comandi: utile per provare senza microfono |
| Comandi cancella parola/frase, annulla | fatto | parole nostre, non di Microsoft |

Il bundle JS principale è 597 kB (188 kB compresso); docx e PDF si caricano solo quando servono. Da ridurre più avanti.

## Non verificato
- Il microfono vero NON è stato provato qui (serve una persona che parli in Chrome/Edge/Safari). I test automatici coprono la logica dei comandi (7 test), non l'audio.
- Su Android Chrome la Web Speech API a volte ripete l'ultima frase: da verificare su telefono.
- Nessuno screenshot per il confronto: `replica/clone-screens/` è ancora vuota.

## Prossimi passi (M2)
Autosalvataggio, 4 lingue (EN/FR/ES), export .docx/.pdf/.md, email, impostazioni, aiuto comandi.

## M2c (2026-11-08) — chiuse le funzioni obbligatorie
- Cancella N parole/frasi ("cancella 3 parole") e cancella da X a Y, in 4 lingue (`src/commands/syntax.ts`). Limite: in "da X a Y" la parte Y è tutto il resto della frase detta, quindi il comando va detto da solo.
- Formattazione a voce: grassetto / corsivo / sottolineato / rimuovi formattazione su "questo" (ultimo testo detto), "ultima parola", "ultima frase".
- Simboli, valuta e matematica nelle 4 lingue.
- Aiuto: nuova sezione con esempi per ogni lingua.
- Test: 54 sulla logica, 120 nel browser (desktop + telefono), tutti verdi. Difetto trovato e corretto: BUG-004.
- Resta non verificato: voce vera, Word vero, spagnolo da madrelingua.

## M2d (2026-11-08) — idee dai concorrenti GitHub (vedi competitors.md)
- Pulizia del testo: toglie "ehm/uhm" (acceso), ripetizioni (spento); dizionario personale con importa/esporta; impostazioni salvate (`src/text/clean.ts`).
- Pausa/ripresa/ferma a voce in 4 lingue; pulsante Riprendi; scorciatoie Alt+Maiusc+D ed Esc.
- Test: 66 sulla logica, 164 nel browser (desktop + telefono), tutti verdi.
- Limite scoperto: la scelta del microfono non è possibile con il riconoscimento del browser.
- Non verificato: voce vera; quanto le liste di "ehm/uhm" corrispondano a ciò che il riconoscimento vero scrive (alcuni motori li tolgono già da soli).

## M2e (2026-11-08) — dalle recensioni delle app che registrano (vedi fixes-recorders.md)
- Copia di sicurezza: scarica/ripristina un file JSON con tutti i documenti e le impostazioni; il file viene controllato prima e non importa niente a metà (`src/store/backup.ts`). Promemoria sempre visibile.
- Cambio lingua al volo: selettore nella barra e comandi "passa all'inglese", "switch to italian", "passe en français", "cambia a español". Se stava ascoltando, il microfono riparte nella nuova lingua; i vecchi eventi del microfono vengono ignorati per evitare stati sbagliati.
- Prova del microfono (Impostazioni): barra di livello, nome del microfono, messaggi per bloccato / assente / silenzioso; il microfono si spegne chiudendo la finestra.
- Avviso "ascolto ma non arriva testo" dopo 10 s (non in pausa), con scorciatoia alla prova del microfono; anche "non ti sento" la offre.
- Test: 74 sulla logica, 204 nel browser (desktop + telefono), tutti verdi. Nessun difetto nuovo trovato in questo giro.
- Non verificato: voce vera; il comportamento del cambio lingua con il riconoscimento vero di Chrome (nel test il riconoscimento è simulato); la barra di livello con microfoni reali (nel test c'è un microfono finto di Chrome).
