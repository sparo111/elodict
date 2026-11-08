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
