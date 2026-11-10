# Elodict

*Creata per Mimma, in segno di profonda gratitudine per la sua onestà intellettuale.*

**Detta con la voce direttamente nel browser, su un foglio A4.** Gratis, senza account, senza installare niente.

👉 **Provalo: <https://sparo111.github.io/elodict/>** · Come installarlo (pagina da stampare): <https://sparo111.github.io/elodict/installa.html> · Codice sorgente: <https://github.com/sparo111/elodict> (licenza AGPL-3.0)

> Elodict è un **nome di lavoro** (i controlli sul marchio non sono finiti). Questa cartella si chiama ancora `mia-dictate`.
> *English: a free, no-install, no-account web app for voice dictation into a real A4-page editor, in Italian, English, French and Spanish. A clean-room functional rebuild of Microsoft Word's "Dictate": no code, assets, colours or copy from the original. No backend.*

## Per chi usa l'app
1. Apri il link che ti hanno mandato.
2. La prima volta ti fa 3 domande semplici: la lingua, il microfono, come vuoi che ascolti. Puoi saltarle.
3. Premi il pulsante grande **«Installa Elodict»**. Sullo schermo (o sul telefono) compare la sua icona.
4. Da quel momento si apre con un tocco e funziona anche **senza internet** (se hai scelto l'ascolto «Privato», dopo aver scaricato la voce una volta).
5. Quando c'è una versione nuova, in alto compare «È pronta una nuova versione»: premi **Aggiorna**. Il tuo testo viene salvato prima.

Su iPhone e iPad il programma te lo fa fare in 3 passi con i disegni. Se non sai come fare, c'è una pagina da stampare, grande e in 4 lingue: `installa.html`.

## Cosa fa
- **Detti e il testo compare** in un foglio A4 vero (21 × 29,7 cm, margini di 2,54 cm, numero di pagina). A fine riga e a fine foglio il testo va a capo da solo, anche a metà paragrafo.
- **Quattro lingue**, sia per i menu sia per la voce: italiano, inglese, francese, spagnolo. Le bandierine accanto al nome le cambiano insieme.
- **Comandi vocali** nelle quattro lingue: punteggiatura, simboli, «a capo», annulla, cancella (anche «cancella 3 parole» e «cancella da X a Y»), grassetto, corsivo, sottolineato, maiuscolo, selezione, elenchi, pausa e ripresa, cambio lingua, «mostra comandi».
- **Tre modi di ascoltare**: quello del browser (veloce, serve internet; su Chrome l'audio passa da Google), **Whisper offline** nel browser (l'audio resta sul tuo dispositivo; funziona anche su Firefox; il modello si scarica una volta, 40 o 80 MB) e **«Privato preciso»** con Parakeet (più preciso, circa 200 MB una volta, senza internet; la lingua si riconosce da sola). La scelta di partenza resta il browser.
- **Salva e invia**: salvataggio automatico nel browser, copia di sicurezza, esportazione in **Word, PDF, Markdown, testo, pagina web** con nome e cartella a scelta, invio per email.
- **Utile da sapere**: pulizia di «ehm/uhm», dizionario personale, prova del microfono, casella «Prova senza microfono» per provare tutto scrivendo.

## Come si usa (da sviluppatore)
```bash
npm install
npm run dev        # apre il sito, di solito http://localhost:5173 (usa Chrome, Edge o Safari per la voce)
npm test           # prove sulla logica (Vitest)
npm run test:e2e   # prove nel browser (Playwright): npx playwright install chromium la prima volta
npm run build      # controlla i tipi e crea dist/
```
Le prove con Whisper vero hanno bisogno di internet e delle registrazioni di prova: `powershell -ExecutionPolicy Bypass -File e2e/make-fixtures.ps1` (altrimenti si saltano da sole).

## Stato
- **Parità con Dictate: 75,9 / 100**, funzioni obbligatorie 10 su 10; difetti aperti: nessuno.
- **188 prove sulla logica e 475 nel browser** (computer e telefono): 463 riuscite, 12 saltate di proposito.
- **Non ancora fatto o verificato**: nessuna prova con una voce umana vera; scelta del microfono provata solo con microfoni finti; elenco dei documenti provato solo con Chromium; `.docx` mai aperti in Word vero; spagnolo da far rivedere a un madrelingua; controlli sul marchio; installazione mai provata su un iPhone o un Android veri. **È pubblicato** su GitHub Pages (flusso `.github/workflows/deploy.yml`, a ogni aggiornamento di `main`).

## Dove leggere di più
| file | per cosa |
| --- | --- |
| [`RIEPILOGO.md`](RIEPILOGO.md) | **il riepilogo completo**: decisioni, architettura, mappa dei file, convenzioni, cosa non è verificato |
| [`replica/architecture.md`](replica/architecture.md) | stack, dati, moduli, rischi |
| [`replica/features.csv`](replica/features.csv) · [`replica/parity.md`](replica/parity.md) | funzioni e punteggio di parità |
| [`replica/build-log.md`](replica/build-log.md) · [`replica/bugs.md`](replica/bugs.md) | cronologia e difetti trovati |
| [`replica/test-plan.md`](replica/test-plan.md) | cosa si prova e cosa resta da provare a mano |
| [`replica/brand.md`](replica/brand.md) | nome, controlli, palette, voce |
| [`replica/fixes.md`](replica/fixes.md) · [`replica/fixes-recorders.md`](replica/fixes-recorders.md) · [`replica/competitors.md`](replica/competitors.md) | cosa dicono gli utenti e i concorrenti |

## Origine e regole
Il progetto ricostruisce **le funzioni e l'esperienza d'uso** di Dictate (Microsoft 365) in modo «clean-room»: ogni riga di codice, colore, testo e icona è scritta da zero; fonti solo pagine pubbliche di aiuto. I recensori citati nei documenti sono materiale di studio, non testimonianze.

## Licenza
Elodict è software libero, rilasciato con la licenza **GNU Affero General Public License, versione 3** (`AGPL-3.0-only`): il testo completo è nel file [`LICENSE`](LICENSE). In pratica: puoi usarlo, studiarlo, modificarlo e condividerlo; se ne metti online una versione modificata, devi offrire il codice sorgente a chi la usa (sezione 13). Per questo in fondo a **Impostazioni** c'è il collegamento «Codice sorgente (licenza AGPL-3.0)», che porta a <https://github.com/sparo111/elodict>.

Le librerie usate hanno le proprie licenze (React, TipTap, Dexie, docx, jsPDF, Transformers.js, onnxruntime-web, Lucide, Inter e Source Serif 4). I modelli Whisper (`Xenova/whisper-tiny` e `-base`) si scaricano da huggingface.co e hanno la propria licenza. «Privato preciso» usa Parakeet TDT 0.6B v3 (NVIDIA; conversioni di istupakov, moondream e Olicorne), licenza CC-BY-4.0: i crediti sono in Impostazioni.
