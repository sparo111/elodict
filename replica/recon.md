# Recon: Dictate (Microsoft 365)

> **Documento storico**: lo studio iniziale della funzione Dictate, scritto prima che il prodotto avesse nome e prima delle tappe M2-M5. Il progetto è oggi Elodict; per lo stato attuale vedi `RIEPILOGO.md`, `features.csv` e `parity.md`. Le decisioni dell'utente su piattaforma e lingue (sezioni 8b e 10) sono ancora valide.

Data: 2026-11-08. Metodo: clean-room, solo pagine di aiuto pubbliche. Nessun account, nessun codice, nessuna API privata.

## 0. In parole semplici
Dictate è un pulsante dentro Word (e altre app Office): premi, parli, il testo compare nel documento. Puoi anche dire "comandi" a voce ("virgola", "a capo", "grassetto", "cancella l'ultima frase"). Il riconoscimento vocale lo fa un servizio Microsoft in cloud; noi ricostruiamo l'esperienza, non il motore di Microsoft.

## 1. Scope (proposto, da confermare)
| Domanda | Risposta proposta |
| --- | --- |
| App e piattaforma | App INDIPENDENTE da Word (decisione dell'utente, 2026-11-08): web app nel browser, con un suo editor, che funziona anche su telefono. Il testo si copia/scarica e si incolla ovunque. |
| Lingue | Inglese, italiano, francese, spagnolo (decisione dell'utente). Servono i comandi vocali in tutte e 4 le lingue. |
| Fetta | Il ciclo base: editor di testo + pulsante Dictate + comandi vocali (punteggiatura, modifica, formattazione) + impostazioni (lingua, microfono, punteggiatura automatica, filtro parolacce) |
| Per chi | Uso personale / prodotto tuo (non serve l'abbonamento Microsoft) |

**Core loop:** premi Dictate -> parli -> il testo appare -> dici un comando per correggere/formattare -> premi Stop.

## 2. Fonti
| fonte | URL | stato |
| --- | --- | --- |
| Pagina indice Dictate | https://support.microsoft.com/en-us/word/dictate-in-microsoft-365 | letta (è solo un indice) |
| Word desktop (Win/Mac) | https://support.microsoft.com/en-us/word/dictate-your-documents-in-word | letta (parte finale solo riassunta) |
| Word web | https://support.microsoft.com/en-us/word/dictate-your-documents-in-word-for-the-web | letta (parte finale solo riassunta) |
| Word mobile | https://support.microsoft.com/en-us/word/dictate-your-documents-in-word-mobile | letta |
| Outlook | https://support.microsoft.com/en-us/topic/4010d238-bb25-45e9-89f6-8f9b54fcc0fc | NON letta |
| OneNote | https://support.microsoft.com/en-us/topic/2f5d1549-afe1-4abd-95ff-829a839e3d00 | NON letta |
| PowerPoint | https://support.microsoft.com/en-us/topic/97f3373e-58b9-4e39-b413-83d6d2c09055 | NON letta |
| Privacy (Connected Experiences) | https://support.microsoft.com/en-us/topic/8d2c04f7-6428-4e6e-ac58-5828d4da5b7c | non letta |

**Limite onesto:** non ho screenshot né ho usato l'app dal vivo. Le schermate sotto sono dedotte dal testo di aiuto, quindi la confidenza sul layout è media. `replica/screens/` è vuota: se hai Word con abbonamento, puoi aggiungere tu gli screenshot (a velocità umana, tu presente).

## 3. Schermate (inventario)
| ID | schermata | come ci si arriva | scopo | componenti chiave | stati |
| --- | --- | --- | --- | --- | --- |
| S01 | Editor documento | apertura app | scrivere/leggere testo | area testo, barra Home | vuoto, con testo, sola lettura (Dictate grigio) |
| S02 | Barra Home con pulsante Dictate | S01 > Home | avviare/fermare | pulsante Dictate (toggle) | spento, in ascolto, disattivato, microfono bloccato |
| S03 | Menu dictation fluttuante (web) | dopo avvio | pausa/ripresa, impostazioni, aiuto | icona mic, ingranaggio, punto interrogativo | in ascolto, in pausa |
| S04 | Impostazioni (ingranaggio) | S03 > ingranaggio | scelte utente | menu lingua, menu microfono, interruttore punteggiatura automatica, interruttore filtro parolacce | lingua con/senza punteggiatura auto |
| S05 | Pannello aiuto comandi | dire "show commands" / "show help" | elenco comandi | lista per categorie | aperto/chiuso |
| S06 | Errori microfono | automatico | spiegare il problema | messaggi: "no access", "problem with mic", "can't hear you" | 3 messaggi |
| S07 | Parole dubbie (web) | dopo dettatura | correggere errori | sottolineatura parole incerte, azione "Ignore" | presente/assente |
| S08 | Mobile: barra con microfono | tap sul mic | dettare da telefono | pulsante mic, comandi ridotti | in ascolto, bozza email (send email -> yes/cancel) |

## 4. Flussi
- **F01 Dettare un testo.** S01 -> S02 (clic Dictate) -> parli -> testo in S01 -> clic Dictate per fermare. *Clic percorso felice: 2.* Edge: microfono negato (S06), connessione lenta, documento in sola lettura, rumore.
- **F02 Correggere a voce.** In ascolto -> "delete that" / "undo" / "select last sentence" -> "bold that". Edge: comando letto come testo.
- **F03 Cambiare lingua/impostazioni.** S03 -> ingranaggio -> S04 -> scegli lingua/mic/toggle. Edge: lingua in "anteprima" (qualità minore).
- **F04 Cercare un comando.** dire "show commands" -> S05.
- **F05 Pausa e ripresa.** "pause dictation" / "resume dictation" (o ALT+`; su Mac Option+F1).
- **F06 (mobile) Inviare email a voce.** "send email" -> conferma "yes"/"cancel". *Fuori scope iniziale.*

**Numero da battere:** 2 clic per iniziare a dettare.

## 5. Componenti
| componente | varianti/stati | usato in |
| --- | --- | --- |
| Pulsante Dictate (toggle) | spento / in ascolto / disattivato / errore | S02 |
| Indicatore di ascolto | attivo / pausa | S02, S03 |
| Menu a tendina | lingua, microfono | S04 |
| Interruttore | punteggiatura auto, filtro parolacce | S04 |
| Pannello aiuto | lista per categoria | S05 |
| Messaggio d'errore | 3 tipi | S06 |
| Evidenziazione parole dubbie | con azione Ignore | S07 |
| Scorciatoia da tastiera | mostrata nel tooltip | S02 |

## 6. Modello dati dedotto
```
Documento     id, testo (rich), lingua_doc, sola_lettura
              evidenza: S01, mobile troubleshooting; confidenza: alta
Impostazioni  lingua_dettatura (default = lingua documento), microfono_id,
              punteggiatura_auto (bool), filtro_parolacce (bool, maschera con ***)
              evidenza: S04; confidenza: alta
Comando       frase_pronunciata, categoria, azione, lingua
              (categorie: punteggiatura, simboli, matematica, valuta, emoji, modifica,
               selezione/navigazione, formattazione, liste, tabelle(web), commenti, controllo)
              evidenza: tabelle comandi; confidenza: alta (inglese), bassa (italiano: tabella non letta)
Sessione      stato (spenta|ascolto|pausa), inizio, trascrizione_parziale
              evidenza: flussi F01/F05; confidenza: media (ipotesi)
```
Privacy dichiarata da Microsoft: audio e testo non vengono salvati, l'audio serve solo a restituire il testo. Per la nostra versione: scelta nostra.

## 7. Cose che NON si possono clonare
Vedi `features.csv` righe `skip`: il motore di riconoscimento vocale di Microsoft (si usa un'alternativa: Web Speech API del browser o servizio terzo), l'abbonamento/account Microsoft, l'integrazione dentro Word/Outlook/PowerPoint, i modelli per le ~50 lingue.

## 8. Dimensione
- Schermate: 8 (4 vere nel MVP). Flussi: 6. Entità: 4.
- Parti difficili: (1) riconoscimento vocale affidabile e comandi in italiano; (2) interpretare i comandi vs testo normale ("virgola" è comando o parola?); (3) comandi di selezione/modifica sul testo ("cancella da X a Y").
- Taglia: **S** per il MVP (dettatura + punteggiatura + modifica base), **M** con formattazione, liste, tabelle e più lingue.

## 8b. Decisioni dell'utente (2026-11-08)
- **Gratuita** (nessun abbonamento, nessun account obbligatorio).
- **Senza installazione:** si apre da un link nel browser (web app, installabile come PWA solo se l'utente vuole).
- **Esporta** il documento in Word (.docx), PDF, Markdown (.md), testo (.txt), e altri formati (es. .html, .rtf).
- **Invio via email** del file generato.

Conseguenze tecniche (da portare in replica-architect):
- Gratis = niente motore vocale a pagamento. Si parte dal riconoscimento vocale del browser (Web Speech API): funziona bene su Chrome/Edge/Safari, **non su Firefox**; su Chrome l'audio passa dai server di Google (da dichiarare nella privacy). Alternativa gratuita più privata: modello che gira nel browser (più pesante da scaricare, qualità e lingue da verificare).
- Export: .docx/.pdf/.md/.txt si possono generare **nel browser**, senza server e senza costi.
- Email gratuita senza account: (a) apre il programma di posta dell'utente con oggetto e testo pronti (`mailto:`), ma **non può allegare il file**; (b) su telefono il menu "Condividi" può allegare il file; (c) invio vero con allegato richiede un server e un servizio email (ha limiti gratuiti e rischio spam).
- Nessun salvataggio sui nostri server: il documento resta nel browser (salvataggio locale), così costo e privacy sono semplici.

## 9. Da confermare con te
1. "Al di là di Word": basta un editor tuo nel browser (copia/scarica il testo), o vuoi anche dettare DENTRO altre app (es. Gmail, Notion)? La seconda richiede un'estensione del browser o un'app desktop: è più grande (taglia M/L).
2. Uso personale o prodotto da vendere?
3. Lingue decise: EN, IT, FR, ES. Tabelle comandi: vedi sezione 10.

## 10. Comandi vocali per lingua (fonte: pagine di aiuto Word)
**Scoperta importante:** Microsoft ha i comandi di *modifica e formattazione* ("delete that", "bold that", "undo", "select...") **solo in inglese**. In italiano, francese e spagnolo ha solo punteggiatura, simboli, matematica, valuta ed emoji. Per IT/FR/ES i comandi di modifica li dovremo inventare noi (es. "cancella", "annulla", "grassetto"): è una scelta di design nostra, non una copia.

Affidabilità: IT e FR letti testualmente. ES solo da riassunto (da ricontrollare). Dove le frasi erano incollate sulla pagina, il separatore è un'interpretazione.

| Azione | EN | IT | FR | ES (riassunto) |
| --- | --- | --- | --- | --- |
| . | period / full stop | punto | point | punto |
| , | comma | virgola | virgule | coma |
| ? | question mark | punto interrogativo / punto di domanda | point d'interrogation | signo de interrogación (¿ = signo de apertura de interrogación) |
| ! | exclamation mark | punto esclamativo | point d'exclamation | signo de exclamación (¡ = signo de apertura de exclamación) |
| a capo | new line | a capo / nuova riga | saut de ligne / nouveau paragraphe | salto de línea / nueva línea / nuevo párrafo |
| : | colon | due punti | deux points | dos puntos |
| ; | semicolon | punto e virgola | point-virgule | punto y coma |
| ... | ellipsis | puntini di sospensione | points de suspension | puntos suspensivos |
| ( ) | open/close parentheses | parentesi aperta / chiusa | parenthèse ouvrante / fermante | abrir / cerrar paréntesis |
| @ | at sign | a commerciale | arobase | arroba |
| € | euro sign | simbolo di euro | signe euro | símbolo del euro |
| = | equal sign | segno di uguale | signe égal | signo igual |

Altre tabelle complete (simboli, matematica, valuta, emoji) sono nel report della ricerca; le trasferiremo in un file dati (`commands.json`) in fase di build.
Anomalie nella fonte: IT "segno di percentuale" ha l'output sbagliato nella pagina Microsoft; FR "saut de ligne/nouveau paragraphe" non hanno un output simbolo (sono azioni). Da gestire a mano.

## 11. Concorrente osservato: "dictate. — Voice to Text" (App Store)
Fonte: https://apps.apple.com/us/app/dictate-voice-to-text/id6759285154 (pagina pubblica letta il 2026-11-08; nessuna recensione disponibile, nessun uso diretto dell'app).
Non è Dictate di Microsoft: è un'app indipendente (sviluppatore singolo) per iPhone/iPad/Mac, nata a marzo, ex "Hyper Whisper".

| aspetto | cosa dichiara |
| --- | --- |
| Cos'è | tastiera di sistema: detti dentro qualsiasi app, senza copia-incolla |
| Prezzo | gratis + abbonamento Pro: 2,99 $/mese o 19,99 $/anno |
| Funzioni | punteggiatura e paragrafi automatici; pulizia parole riempitive; dizionario personale; traduzione (parli in una lingua, scrivi in un'altra); 30+ lingue; cronologia ricercabile; sync con Mac; widget |
| Privacy (dichiarata) | audio elaborato in modo sicuro, registrazioni non salvate |
| Recensioni | nessuna ancora: non è possibile ricavare cosa piace o non piace |

Cosa ne ricaviamo:
- La sua forza è la **tastiera di sistema**: una web app non può esserlo. Resta aperta la domanda "dettare dentro altre app" (estensione browser o app nativa).
- Differenziazione di Mia Dictate: **gratis**, senza account, senza installazione, export in 5 formati.
- Idee fattibili nel browser e senza costi: eliminare le parole riempitive e un dizionario personale (aggiunte a `features.csv`).
