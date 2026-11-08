# Concorrenti su GitHub (studio del 2026-11-08)

Metodo: ricerca nei repository pubblici di GitHub, lettura di README e dell'elenco file. **Nessun codice copiato**: si prendono solo le idee (clean-room). Sono progetti giovani e piccoli (nati nel 2026, da 0 a 19 stelle), quindi valgono come fonte di idee, non come prova di cosa vuole il mercato.

## Verificati
| progetto | cos'è | licenza | stato |
| --- | --- | --- | --- |
| stofll/Sotto | dettatura offline per Windows/Mac (Tauri, Rust) | MIT | 19 stelle, attivo a novembre 2026 |
| Gargeya-Grey/Odicto | dettatura con scorciatoia, Windows/Mac/Linux (Python) | Apache-2.0 | 0 stelle, attivo |
| DanielMuellerIR/stille_post | dettatura per Mac con pulizia del testo (Swift) | non verificata | 1 stella, attivo |
| wankdanker/murmur | estensione Chrome con Whisper nel browser (Transformers.js) | **nessun file di licenza**: nessun permesso di riuso | 0 stelle, nuovo |
| (altri) whisper-tiny-web, SonicScribe, thoughtborne, voxiray… | piccoli esperimenti | non verificate | 0-9 stelle |
| k2-fsa/sherpa-onnx | motore di riconoscimento offline (C++, 15.800 stelle) | Apache-2.0 | molto attivo; ma è un motore, non un'app di dettatura |

Non trovato: nessun editor **gratuito nel browser** con comandi vocali in 4 lingue e salvataggio in più formati. Il nostro spazio è libero.

## Idee prese (e fatte)
| idea | da chi | come l'abbiamo fatta |
| --- | --- | --- |
| Togliere i suoni di esitazione ("ehm", "uhm") | Sotto, stille_post | solo suoni, mai parole vere; elenco per lingua; acceso di default, si spegne |
| Togliere parole ripetute | Sotto, stille_post | spento di default; non tocca numeri né parole di 1-2 lettere ("no no") |
| Dizionario personale con sostituzioni, importa/esporta | Sotto, stille_post | voci "come lo sente → come lo vuoi", non tocca i comandi vocali, file JSON controllato |
| Pausa e ripresa della dettatura | stille_post, Murmur | a voce in 4 lingue + pulsante Riprendi; in pausa si ascoltano solo "riprendi" e "ferma" |
| Scorciatoia da tastiera e Esc per fermare | Murmur, Sotto, Odicto | Alt+Maiusc+D e Esc (Esc non ferma se è aperta una finestra) |

## Idee buone, non ancora fatte
| idea | da chi | perché non ora |
| --- | --- | --- |
| **Riconoscimento offline nel browser (Whisper via Transformers.js)** | Murmur, vari | È la mossa più grossa: funzionerebbe anche su Firefox, con l'audio che non lascia il dispositivo (niente Google), con scelta del microfono. Costo: download di 77-560 MB, lentezza su computer deboli, qualità da provare per lingua. Merita un suo milestone |
| Cronologia con ricerca | Sotto, stille_post | oggi si salva solo l'ultimo documento |
| Elenchi a voce ("elenco puntato") | stille_post (comandi di formattazione) | facile, da fare con i comandi |
| Pulizia con intelligenza artificiale (rispettosa del testo) | Sotto, stille_post | richiede un servizio a pagamento o un modello locale: contrasta con "gratis e senza server" |
| Scelta del microfono | Sotto, stille_post | **non possibile** con il riconoscimento del browser (usa sempre il microfono predefinito del sistema); possibile solo con Whisper nel browser |
| Sagoma/overlay personalizzabile, suoni, statistiche | Sotto | belle ma non servono al valore principale |
| Tastiera di sistema, dettare in ogni app | Odicto, Sotto, "dictate." | non fattibile come sito web: servirebbe estensione o app |

## Cosa tenere d'occhio
- La qualità di tutti dipende dal motore vocale, non dalla loro interfaccia: la nostra scelta di partire dal riconoscimento del browser è la più semplice e gratuita, ma la meno privata.
- Le licenze: MIT e Apache-2.0 permetterebbero di riusare codice, ma non serve e lo evitiamo; Murmur senza licenza non va riusato in nessun caso.
