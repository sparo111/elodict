import type { CommandDef, Segment, Step, Token } from "./types";

const normalize = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'");

/**
 * Trasforma la frase riconosciuta in parole e comandi.
 * Le frasi più lunghe vincono ("punto e virgola" prima di "punto").
 */
export function tokenize(transcript: string, commands: CommandDef[]): Token[] {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const phrases = commands
    .flatMap((c) => c.phrases.map((p) => ({ words: p.split(" "), action: c.action })))
    .sort((a, b) => b.words.length - a.words.length);

  const tokens: Token[] = [];
  let i = 0;
  while (i < words.length) {
    const hit = phrases.find((p) => p.words.every((w, k) => words[i + k] !== undefined && normalize(words[i + k]) === w));
    if (hit) {
      tokens.push({ kind: "cmd", action: hit.action });
      i += hit.words.length;
    } else {
      tokens.push({ kind: "word", text: words[i] });
      i += 1;
    }
  }
  return tokens;
}

/** Separa i comandi di modifica (annulla, cancella…) dal testo da scrivere. */
export function splitSteps(tokens: Token[]): Step[] {
  const steps: Step[] = [];
  let run: Token[] = [];
  const flush = () => {
    if (run.length) steps.push({ kind: "run", tokens: run });
    run = [];
  };
  for (const t of tokens) {
    if (t.kind === "cmd" && t.action.type === "edit") {
      flush();
      steps.push({ kind: "edit", op: t.action.op });
    } else run.push(t);
  }
  flush();
  return steps;
}

const SENTENCE_END = /[.?!…]$/;
export const NBSP = " ";

/**
 * Mette insieme i pezzi con spazi e maiuscole giuste.
 * `before` = gli ultimi caratteri già presenti nel documento prima del cursore.
 */
export function compose(tokens: Token[], before: string): Segment[] {
  const out: Segment[] = [];
  const lastChar = before.slice(-1);
  let atLineStart = before === "" || lastChar === "\n";
  let needSpace = !atLineStart && !/\s/.test(lastChar);
  let capNext = atLineStart || SENTENCE_END.test(before.trimEnd());

  const push = (text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === "text") last.text += text;
    else out.push({ kind: "text", text });
  };

  for (const t of tokens) {
    if (t.kind === "word") {
      let w = t.text;
      if (capNext) w = w.charAt(0).toUpperCase() + w.slice(1);
      push((needSpace ? " " : "") + w);
      needSpace = true;
      capNext = false;
      atLineStart = false;
      continue;
    }
    const a = t.action;
    if (a.type === "punct") {
      if (a.spaceBefore && !atLineStart) push(NBSP);
      push(a.char);
      needSpace = true;
      capNext = SENTENCE_END.test(a.char);
      atLineStart = false;
    } else if (a.type === "open") {
      push((needSpace ? " " : "") + a.char);
      needSpace = false;
      atLineStart = false;
    } else if (a.type === "close") {
      push(a.char);
      needSpace = true;
      atLineStart = false;
    } else if (a.type === "break") {
      out.push({ kind: "break", paragraph: a.paragraph });
      needSpace = false;
      capNext = true;
      atLineStart = true;
    }
  }
  return out;
}

export function parseTranscript(transcript: string, commands: CommandDef[]): Step[] {
  return splitSteps(tokenize(transcript, commands));
}

/** Comodo per i test: una sola frase, senza modifiche. */
export function dictationToSegments(transcript: string, before: string, commands: CommandDef[]): Segment[] {
  const steps = parseTranscript(transcript, commands);
  const run = steps.find((s) => s.kind === "run");
  return run && run.kind === "run" ? compose(run.tokens, before) : [];
}
