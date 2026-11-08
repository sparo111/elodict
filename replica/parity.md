# Parità: Elodict contro Dictate (Microsoft 365)

Aggiornato: 2026-11-08, dopo il foglio A4, l'a capo e le bandierine. Storia del punteggio: 43,1 → 52,9 → 58,8 → 62,7 → 72,5 → **75,9**.
Si ricalcola con `parity.py` (competenza `replica-diff`) leggendo `replica/features.csv`.

## Verdetto: quasi pubblicabile, ma sotto la soglia
- Punteggio funzioni: **75,9 / 100**.
- **Tutte le 10 funzioni obbligatorie sono complete.**
- Difetti gravi (S1/S2) aperti: **nessuno** (vedi `bugs.md`: 5 difetti trovati, tutti corretti).
- «Pubblicabile» richiede obbligatorie complete **e** punteggio di almeno 80: mancano circa 4 punti.

Il punteggio pesa obbligatorie ×3, consigliate ×2, facoltative ×1, conta le «a metà» come metà, e lascia fuori le funzioni non clonabili e quelle che l'originale non ha (elenco sotto). Per questo non misura quanto l'app valga: dentro ci sono molti comandi vocali facoltativi di Microsoft.

## Confronto del layout: non fatto
`replica/screens/` è vuota: nessuno screenshot dell'originale, quindi nessun punteggio di layout. Non serve inseguirlo: l'aspetto dell'originale è suo, e colori, nome e icona sono comunque nostri.

## Funzioni per area (dalla più scarsa)
| area | punti | note |
| --- | --- | --- |
| qualità (parole dubbie) | 0 | facoltativo, non fatto |
| piattaforma / mobile | 0 | versione mobile con comandi ridotti, invio email a voce: non fatti |
| impostazioni | 50 | fatti: lingua; mancano scelta del microfono (con Whisper ora sarebbe possibile), filtro parolacce; punteggiatura automatica solo a metà |
| comandi | 70 | fatti: punteggiatura, simboli, annulla, cancella (anche N e «da X a Y»), formattazione, maiuscolo/minuscolo, elenchi, selezione base; mancano emoji, tabelle, commenti, allineamento, navigazione |
| errori | 75 | manca solo lo stato «sola lettura» |
| core, controllo, aiuto, lingue, editor | 100 | fatti: dettatura, pausa/ripresa/scorciatoie, aiuto e «mostra comandi», 4 lingue con cambio al volo, foglio A4 + a capo + zoom |

## Ancora da fare (in ordine di costruzione)
1. **Scelta del microfono** (consigliata) — non possibile con il riconoscimento del browser, possibile con Whisper.
2. **Selezione a voce** completa: per paragrafo e «da X a Y» (oggi: tutto, ultima parola, ultima frase).
3. **Punteggiatura automatica vera** (oggi una regola semplice: punto dopo ogni pausa).
4. Facoltative: allineamento e rientro, emoji, navigazione, tabelle, commenti a voce; filtro parolacce; stato «sola lettura»; parole dubbie con «Ignora»; versione mobile con comandi ridotti.

## Differenze di comportamento (da pagine di aiuto, non dall'uso dell'originale)
| flusso | originale | Elodict | scelta |
| --- | --- | --- | --- |
| Avviare la dettatura | Home > Dictate (2 passi), serve Microsoft 365 | 1 clic, nessun account, gratis | tenere: meglio |
| Comandi di modifica e formattazione | solo in inglese | 4 lingue (parole nostre) | tenere |
| Punteggiatura automatica | sì (alcune lingue) | regola semplice, facoltativa | da migliorare |
| Pausa/ripresa a voce | sì | sì, in 4 lingue | fatto |
| Selezione a voce | sì (inglese) | sì, base, in 4 lingue | fatto in parte |
| Dove funziona | dentro Word/Outlook/ecc. | qualsiasi browser, foglio A4 proprio, 5 formati di file | tenere: scelta del prodotto |
| Privacy dell'audio | Microsoft dichiara di non salvare audio e testo | motore «browser»: l'audio passa dal servizio del browser (Google su Chrome); motore «offline»: l'audio non esce dal dispositivo; il testo resta sempre sul dispositivo | dichiarato nell'app |

## Cose nostre, non nell'originale (non contano nel punteggio)
Riconoscimento offline con Whisper (anche su Firefox) · copia di sicurezza e ripristino · editor indipendente da Word · esporta Word/PDF/Markdown/testo/web con nome e cartella a scelta · invio per email / Condividi · salvataggio automatico · barra con icone · bandierine per la lingua dell'app e della voce · pulizia del testo e dizionario personale · prova del microfono e avvisi · casella «Prova senza microfono».

## Prima di pubblicare
Per diventare «meglio dell'originale» il lavoro sugli utenti è fatto (`fixes.md`, `fixes-recorders.md`). Mancano comunque: la prova con **un microfono vero e una voce umana**, l'apertura dei .docx in **Word vero**, la revisione dello **spagnolo** da un madrelingua, e i **controlli sul marchio** (vedi `brand.md`). L'elenco completo è in `RIEPILOGO.md`, sezione 15.
