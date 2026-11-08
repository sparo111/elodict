# AUDIT_T003 — Scelta del microfono

Data: 8 novembre 2026. Nessun push, nessuna licenza scelta, nessun repository creato.

## Numeri prima / dopo

| misura | prima | dopo |
| --- | --- | --- |
| prove sulla logica | 149 | **159** (+10: `src/audio/devices.test.ts`) |
| prove nel browser | 386 (376 riuscite, 10 saltate) | **404** (393 riuscite, 11 saltate, 0 cadute) |
| copertura prove sulla logica (righe) | 8,51 % | 8,68 % (`devices.ts`: 100 %) |
| righe di `src/App.tsx` | 209 | 211 (due righe: passa il microfono e l'avviso) |
| `npm audit` | 41 (27 per il codice che arriva agli utenti) | 41 (27): invariato |
| dipendenze nuove | — | nessuna |
| parità con Dictate | 75,9 | 75,9 (la scelta del microfono non è in Dictate: non conta) |

Le 11 saltate: le 10 di prima più la prova con Whisper vero sul telefono (si fa solo sul computer).

## Le 4 righe

**FUNZIONALE — PASS ✅**
- Elenco dei microfoni in Impostazioni, dentro «Prova del microfono»; la prova usa quello scelto; la scelta resta dopo il ricaricamento (e nella copia di sicurezza). L'elenco si aggiorna da solo se si collega o scollega un microfono a finestra aperta.
- Whisper usa il microfono scelto. Se all'avvio non c'è più: parte con il predefinito e avvisa. Se si scollega mentre si ascolta: le ultime parole vengono trascritte, riparte da solo con il predefinito e avvisa.
- **Motore del browser: la scelta non vale e l'app lo dice** (nota sotto l'elenco, visibile solo quando è scelto il browser). Il riconoscimento del browser non offre modo di scegliere il microfono.
- Prove richieste: due dispositivi finti (MIC-H1/H2/H3/H4) e dispositivo scollegato che torna al predefinito con avviso chiaro (MIC-N1 per la prova; MIC-W1 per la dettatura vera con Whisper: sia scollegamento durante l'ascolto sia assenza all'avvio). MIC-W1 usa il modello piccolo vero e si salta da sola senza rete.
- Prima del permesso il browser nasconde nomi e identificativi: l'app lo dice (MIC-N2) e con nomi vuoti numera «Microfono 1, 2…».

**SICUREZZA — PASS ✅**
- Il microfono si apre solo su azione dell'utente (Prova, Detta). L'elenco (`enumerateDevices`) non chiede permessi e non apre nulla.
- L'identificativo del dispositivo resta sul dispositivo (impostazioni locali e, se l'utente la scarica, copia di sicurezza); non viene inviato a nessuno. Nella copia è controllato: testo di al massimo 300 caratteri, altrimenti vuoto.
- Permesso negato non scatena nuovi tentativi: l'errore passa com'è (provato).
- Nessun nuovo accesso a internet, nessun segreto. `npm audit`: 41 segnalazioni (2 basse, 33 medie, 3 alte, 3 critiche), **27 per il codice che arriva agli utenti** (25 medie, 2 alte, `sharp` solo Node e pezzi di TipTap), le altre solo strumenti di sviluppo. Nessuna tocca il codice nuovo.

**QUALITÀ — PASS ✅ (con una nota)**
- Moduli piccoli: `devices.ts` 60 righe, `useMics.ts` 22, `MicTest.tsx` 154. `whisper.ts` era a 251 e con la nuova logica sarebbe andato a ~275: ho spostato il programma audio in `speech/worklet.ts` e ora è 256 (**di poco sopra** le 250 che ci eravamo dati per T002).
- Nessun `catch` vuoto; nessun codice morto. Testi solo in `src/i18n.ts`, stesse chiavi nelle 4 lingue; nessun colore nuovo (`contrast.py`: 0 errori).
- Nota: il ripiego sul predefinito si decide da due soli errori del browser (`OverconstrainedError`, `NotFoundError`). Browser diversi potrebbero usare altri nomi per «dispositivo non trovato»: in quel caso l'errore sarebbe mostrato come un errore normale del microfono, senza ripiego.

**INTEGRAZIONE — PASS ✅**
- Tutte le prove di prima restano verdi, su computer e telefono (390 px), compresi l'accessibilità (axe) sulle Impostazioni con il nuovo elenco, il primo avvio, l'installazione, la copia di sicurezza (fixture aggiornata col campo nuovo; i file vecchi senza il campo si leggono con microfono «predefinito»), la guardia `hydratedFor` (BUG-005) e la prova di gara.
- Il motore si ricrea se si cambia microfono (come già con lingua e modello); se si stava ascoltando, riparte con quello nuovo.

## Cosa NON è verificato
- **Due microfoni veri e uno scollegato davvero**: tutto è provato con dispositivi simulati (elenco e richieste sono un copione; l'audio viene dal microfono finto di Chrome). Il segnale «traccia finita» è simulato.
- **Il riconoscimento del browser con più microfoni**: l'affermazione «non permette di sceglierlo» viene dalla mancanza di un modo per farlo nell'interfaccia di quel servizio, non da una prova su Chrome vero.
- **Firefox e Safari** per l'elenco dei microfoni e per il nome degli errori (vedi nota di qualità).
- **Telefoni veri**: scelta dell'altoparlante/cuffie, Bluetooth.
- Voce umana vera.

## GATE COMPLESSIVO: PASS ✅

## IN ATTESA DI ISTRUZIONE
Non ho iniziato T004. Nessun push, nessuna licenza, nessun repository.
