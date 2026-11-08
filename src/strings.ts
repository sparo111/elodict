// Tutti i testi dell'app, in italiano. In M2 diventeranno 4 lingue (i18next).
export const t = {
  appName: "Mia Dictate",
  dictate: "Detta",
  stop: "Ferma",
  listening: "Ti ascolto…",
  starting: "Avvio del microfono…",
  placeholder: "Premi «Detta» e inizia a parlare. Puoi dire «virgola», «punto» o «a capo».",
  hint: "Lingua: italiano. Comandi: punto, virgola, punto interrogativo, punto esclamativo, due punti, punto e virgola, a capo, nuovo paragrafo.",
  exportTxt: "Scarica .txt",
  exported: "File scaricato.",
  emptyExport: "Non c'è ancora niente da scaricare.",
  unsupportedTitle: "Questo browser non può ascoltarti",
  unsupportedBody: "Apri Mia Dictate con Chrome, Edge o Safari. Firefox non supporta ancora il riconoscimento vocale.",
  privacy: "Quando detti, l'audio viene elaborato dal servizio vocale del tuo browser (su Chrome è di Google). Il testo resta solo sul tuo dispositivo.",
  retry: "Riprova",
  errors: {
    "not-allowed": "Il microfono è bloccato. Clicca sul lucchetto vicino all'indirizzo e consenti il microfono, poi riprova.",
    "no-mic": "Non trovo nessun microfono. Controlla che sia collegato e acceso.",
    "no-speech": "Non ti sento. Avvicinati al microfono o controlla che non sia silenziato.",
    network: "Serve una connessione a internet per dettare.",
    other: "Qualcosa è andato storto con il riconoscimento vocale. Riprova.",
  },
} as const;
