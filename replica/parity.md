# Parità: mia-dictate contro Dictate (Microsoft 365)

Data: 2026-11-08.

## Verdetto: NON ANCORA PRONTA da pubblicare
Punteggio funzioni: **43,1 / 100**. Delle 8 funzioni "obbligatorie" ne sono complete 6; 2 sono a metà. Nessun difetto grave (S1/S2) aperto, vedi `bugs.md`.

Il punteggio pesa obbligatorie x3, consigliate x2, facoltative x1, conta le "a metà" come metà, e lascia fuori le funzioni che non si possono clonare e quelle che ho aggiunto io. Per questo il numero sembra basso: dentro ci sono tutti i comandi vocali di Microsoft (tabelle, commenti, emoji…), che sono quasi tutti "facoltativi" e non ancora fatti.

## Confronto del layout: non fatto
`replica/screens/` è vuota: non ho screenshot dell'originale, quindi non esiste un punteggio di layout. (Ricostruiamo il lavoro, non l'aspetto: l'aspetto di Microsoft è suo e comunque cambieremo colori e nome.)

## Funzioni per area (dalla più scarsa)
| area | punti | note |
| --- | --- | --- |
| controllo (pausa/ripresa, scorciatoia) | 0 | non fatto |
| qualità (parole dubbie) | 0 | facoltativo |
| piattaforma / mobile | 0 | facoltativo |
| lingue | 30 | 4 lingue con punteggiatura e modifica base; mancano formattazione e simboli |
| impostazioni | 37,5 | c'è la lingua; mancano microfono, punteggiatura automatica, filtro parolacce |
| comandi | 37,5 | punteggiatura, annulla, cancella parola/frase fatti; mancano selezione, formattazione a voce, simboli, emoji, tabelle |
| aiuto | 50 | elenco comandi ok; manca il comando vocale "mostra comandi" |
| errori | 75 | |
| core | 100 | |

## Obbligatorie non completate
1. **Comandi cancella**: ci sono "cancella parola" e "cancella frase"; mancano "cancella N parole" e "cancella da X a Y".
2. **Lingue con comandi vocali**: punteggiatura e modifica base in 4 lingue; mancano formattazione e simboli. Lo spagnolo va rivisto da un madrelingua.

## Differenze di comportamento (da pagine di aiuto, non dall'uso dell'originale)
| flusso | originale | mia-dictate | scelta |
| --- | --- | --- | --- |
| Avviare la dettatura | Home > Dictate (2 passi), serve Microsoft 365 | 1 clic sul tasto Detta, nessun account, gratis | tenere: meglio |
| Comandi di modifica/formattazione | solo in inglese | 4 lingue (parole nostre) | tenere |
| Punteggiatura automatica | sì (alcune lingue) | no | da fare (consigliata) |
| Pausa/ripresa a voce | sì | no | da fare (consigliata) |
| Dove funziona | dentro Word/Outlook/ecc. | in qualsiasi browser, file in 5 formati | tenere: è la scelta del prodotto |
| Privacy audio | Microsoft dichiara di non salvare audio e testo | l'audio passa dal servizio del browser (Google su Chrome); il testo resta sul dispositivo | dichiarato nell'app |

## I 5 passi successivi, in ordine
1. Chiudere le 2 obbligatorie: "cancella N parole/frasi" e "da X a Y"; simboli e formattazione a voce nelle 4 lingue; far rivedere lo spagnolo.
2. Formattazione e selezione a voce ("grassetto", "seleziona frase"): fanno salire molto il punteggio dei comandi.
3. Pausa/ripresa a voce e scorciatoia da tastiera.
4. Scelta del microfono e punteggiatura automatica nelle impostazioni.
5. Cambio lingua al volo e comando vocale "mostra comandi".

Quando le obbligatorie sono chiuse e il punteggio supera 80, il verdetto passa a "pubblicabile". Per diventare "meglio dell'originale" serve `/replica-entrepreneur` (cosa dicono gli utenti di Dictate).
