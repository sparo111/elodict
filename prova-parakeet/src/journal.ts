// Il diario della prova: prima di ogni fase si scrive in localStorage dove si è arrivati e a che ora. Se la pagina viene chiusa o
// ricaricata nel mezzo (per esempio da Safari, per mancanza di memoria), al riavvio si legge e si mostra «Ultima prova interrotta a: …».
// Tutto in try/catch: senza memoria locale (modalità privata) il diario semplicemente non c'è.

const KEY = "prova-parakeet-diario";

export interface JournalEntry {
  /** ora (ISO) */
  at: string;
  engine: string;
  threads: number;
  backend: string;
  /** per esempio «scaricamento file 4 di 5: w2a8/encoder-model.w2a8.onnx (120/190 MB)» */
  phase: string;
}
export interface Journal {
  startedAt: string;
  /** vero se la prova è arrivata in fondo (o è stata chiusa bene) */
  finished: boolean;
  last: JournalEntry | null;
  /** le ultime fasi, dalla più vecchia */
  history: JournalEntry[];
  errors: string[];
  /** ultimo evento di visibilità/chiusura della pagina (pagehide, hidden...) */
  lastPageEvent?: string;
  /** come era stata aperta la pagina: navigate, reload, back_forward */
  openedAs?: string;
}

const MAX_HISTORY = 40;

function read(): Journal | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Journal) : null;
  } catch {
    return null;
  }
}
function write(j: Journal) {
  try {
    localStorage.setItem(KEY, JSON.stringify(j));
  } catch {
    /* niente memoria locale */
  }
}

export const readJournal = read;

export function startJournal() {
  write({ startedAt: new Date().toISOString(), finished: false, last: null, history: [], errors: [], openedAs: navType() });
}

export function markPhase(cfg: { engine: string; threads: number; backend: string }, phase: string) {
  const j = read() ?? { startedAt: new Date().toISOString(), finished: false, last: null, history: [], errors: [] };
  const e: JournalEntry = { at: new Date().toISOString(), engine: cfg.engine, threads: cfg.threads, backend: cfg.backend, phase };
  j.last = e;
  j.history.push(e);
  if (j.history.length > MAX_HISTORY) j.history.splice(0, j.history.length - MAX_HISTORY);
  j.finished = false;
  write(j);
}

export function journalError(msg: string) {
  const j = read();
  if (!j) return;
  j.errors.push(`${new Date().toISOString()} ${msg}`.slice(0, 800));
  if (j.errors.length > 30) j.errors.splice(0, j.errors.length - 30);
  write(j);
}

export function journalPageEvent(text: string) {
  const j = read();
  if (!j || j.finished) return;
  j.lastPageEvent = `${new Date().toISOString()} ${text}`;
  write(j);
}

export function finishJournal() {
  const j = read();
  if (!j) return;
  j.finished = true;
  write(j);
}

export function navType(): string {
  try {
    return (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type ?? "n/d";
  } catch {
    return "n/d";
  }
}

/** Il testo «Ultima prova interrotta a: …», oppure null se l'ultima prova è finita bene (o non ce n'è). */
export function interruptedReport(j: Journal | null = read()): string | null {
  if (!j || j.finished || !j.last) return null;
  const l = j.last;
  const lines = [
    `Ultima prova interrotta a: ${l.engine} · ${l.threads} thread · ${l.backend} — ${l.phase} (alle ${l.at}; la prova era partita alle ${j.startedAt})`,
    "Significa che la pagina è stata chiusa o ricaricata mentre la prova era in questa fase. Se non l'hai fatto tu, probabilmente il browser l'ha fermata (di solito per mancanza di memoria).",
  ];
  if (j.openedAs) lines.push(`La pagina, prima di quella prova, era stata aperta come: ${j.openedAs}`);
  if (j.lastPageEvent) lines.push(`Ultimo evento della pagina: ${j.lastPageEvent}`);
  if (j.errors.length) lines.push("Errori visti prima dell'interruzione:", ...j.errors.slice(-8).map((e) => `  - ${e}`));
  lines.push("Ultime fasi:", ...j.history.slice(-8).map((e) => `  - ${e.at} ${e.engine} · ${e.phase}`));
  return lines.join("\n");
}
