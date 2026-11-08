import type { CommandDef, Segment, Token } from "./types";

/**
 * Trasforma la frase riconosciuta in una lista di parole e comandi.
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
    const hit = phrases.find((p) =>
      p.words.every((w, k) => words[i + k]?.toLowerCase() === w),
    );
    if (hit) {
      tokens.push(
        hit.action.type === "punct"
          ? { kind: "punct", char: hit.action.char }
          : { kind: "break", paragraph: hit.action.paragraph },
      );
      i += hit.words.length;
    } else {
      tokens.push({ kind: "word", text: words[i] });
      i += 1;
    }
  }
  return tokens;
}

const SENTENCE_END = /[.?!…]$/;

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
    } else if (t.kind === "punct") {
      push(t.char);
      needSpace = true;
      capNext = SENTENCE_END.test(t.char);
      atLineStart = false;
    } else {
      out.push({ kind: "break", paragraph: t.paragraph });
      needSpace = false;
      capNext = true;
      atLineStart = true;
    }
  }
  return out;
}

export function dictationToSegments(
  transcript: string,
  before: string,
  commands: CommandDef[],
): Segment[] {
  return compose(tokenize(transcript, commands), before);
}
