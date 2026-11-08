# Parità: mia-dictate contro Dictate (Microsoft 365)

Aggiornato: 2026-11-08 (dopo le idee dai concorrenti GitHub). Storia: 43,1 → 52,9 → **58,8**.

## Verdetto: quasi pubblicabile, ma sotto la soglia
Punteggio funzioni: **58,8 / 100**. **Tutte le 8 funzioni obbligatorie sono complete.** Difetti gravi (S1/S2) aperti: nessuno (vedi `bugs.md`).
Per essere "pubblicabile" servono tutte le obbligatorie (fatto) **e** un punteggio di almeno 80 (manca).

Il punteggio pesa obbligatorie x3, consigliate x2, facoltative x1, conta le "a metà" come metà, e lascia fuori le funzioni non clonabili e quelle che ho aggiunto io (editor indipendente, esportazioni, email, ecc.: vedi sotto). Per questo il numero è più basso di quanto l'app valga per te: dentro ci sono molti comandi vocali di Microsoft facoltativi.

## Confronto del layout: non fatto
`replica/screens/` è vuota: nessuno screenshot dell'originale, quindi nessun punteggio di layout.

## Funzioni per area (dalla più scarsa)
| area | punti | note |
| --- | --- | --- |
| controllo (pausa/ripresa, scorciatoia) | 100 | fatto (a voce in 4 lingue, Alt+Maiusc+D, Esc) |
| qualità (parole dubbie) | 0 | facoltativo |
| piattaforma / mobile | 0 | facoltativo |
| impostazioni | 37,5 | c'è la lingua; mancano microfono, punteggiatura automatica, filtro parolacce |
| aiuto | 50 | elenco comandi ok; manca il comando vocale "mostra comandi" |
| comandi | 55 | fatti: punteggiatura, simboli, annulla, cancella (anche N e da X a Y), formattazione base; mancano selezione, maiuscolo, liste, emoji, tabelle, commenti |
| lingue | 60 | 4 lingue complete sulle basi; mancano formattazione maiuscolo/minuscolo e il cambio lingua al volo |
| errori | 75 | |
| core | 100 | |

## Differenze di comportamento (da pagine di aiuto, non dall'uso dell'originale)
| flusso | originale | mia-dictate | scelta |
| --- | --- | --- | --- |
| Avviare la dettatura | Home > Dictate (2 passi), serve Microsoft 365 | 1 clic, nessun account, gratis | tenere: meglio |
| Comandi di modifica/formattazione | solo in inglese | 4 lingue (parole nostre) | tenere |
| Punteggiatura automatica | sì (alcune lingue) | no | da fare |
| Pausa/ripresa a voce | sì | sì (4 lingue) | fatto |
| Selezione a voce | sì (inglese) | no | da fare |
| Dove funziona | dentro Word/Outlook/ecc. | qualsiasi browser, 5 formati di file | tenere: scelta del prodotto |
| Privacy audio | Microsoft dichiara di non salvare audio e testo | l'audio passa dal servizio del browser (Google su Chrome); il testo resta sul dispositivo | dichiarato nell'app |

## Cose nostre, non nell'originale (non contano nel punteggio)
Editor indipendente · esporta Word/PDF/Markdown/testo/web con nome e cartella a scelta · invio email / condividi file · salvataggio automatico · barra con icone · casella "prova senza microfono" · 4 lingue di interfaccia.

## I 5 passi successivi, in ordine
1. Selezione a voce ("seleziona frase", "seleziona da X a Y") e maiuscolo/minuscolo.
2. Punteggiatura automatica nelle impostazioni (la scelta del microfono non è possibile con il riconoscimento del browser: vedi `competitors.md`).
3. Valutare il riconoscimento offline nel browser (Whisper): funzionerebbe anche su Firefox e con scelta del microfono.
4. Cambio lingua al volo e comando vocale "mostra comandi".
5. Dai concorrenti: cronologia dei documenti con ricerca ed elenchi a voce. Parole riempitive e dizionario personale sono già fatti (non contano nel punteggio).

Per diventare "meglio dell'originale" serve `/replica-entrepreneur`. In ogni caso, prima di pubblicare, la prova con un microfono vero e con Word vero (vedi `test-plan.md`).
