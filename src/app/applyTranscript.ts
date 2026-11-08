// Applica all'editor una frase detta (o scritta nella casella di prova): parole, punteggiatura e comandi.
import type { Editor } from "@tiptap/react";
import type { Mark } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import { COMMANDS } from "../commands";
import { compose, parseTranscript } from "../commands/parser";
import { SYNTAX } from "../commands/syntax";
import type { ControlAction, Lang } from "../commands/types";
import { charsToDelete, rangeFromTo, rangeOfLast } from "../text/edit";
import { dedupeRepeats, stripFillers, type DictEntry } from "../text/clean";

export interface ApplyOptions {
  dictLang: Lang;
  cleanFillers: boolean;
  cleanRepeats: boolean;
  autoPeriod: boolean;
  dictionary: DictEntry[];
  /** in pausa si ascoltano solo i comandi «riprendi» e «ferma» */
  paused: boolean;
  /** ultimo testo scritto a voce: serve per «grassetto questo» */
  lastInsert: { current: { from: number; to: number } | null };
  /** pausa, ripresa, ferma, mostra comandi, cambio lingua */
  onControl: (a: ControlAction) => void;
}

/** Il testo del paragrafo prima del cursore (serve per spazi e maiuscole). */
function textBefore(editor: Editor): string {
  const { $from } = editor.state.selection;
  return $from.parent.textBetween(0, $from.parentOffset, "\n", "\n").slice(-400);
}

/** Cambia le maiuscole di un tratto di testo senza perdere grassetto, corsivo ecc. */
function transformRange(editor: Editor, range: { from: number; to: number }, fn: (t: string) => string) {
  const { state } = editor;
  const pieces: { start: number; end: number; text: string; marks: readonly Mark[] }[] = [];
  state.doc.nodesBetween(range.from, range.to, (node, pos) => {
    if (!node.isText || !node.text) return;
    const start = Math.max(range.from, pos);
    const end = Math.min(range.to, pos + node.nodeSize);
    pieces.push({ start, end, text: node.text.slice(start - pos, end - pos), marks: node.marks });
  });
  const tr = state.tr;
  for (const p of pieces.reverse()) tr.replaceWith(p.start, p.end, state.schema.text(fn(p.text), p.marks));
  editor.view.dispatch(tr);
}

type Act = Extract<ReturnType<typeof parseTranscript>[number], { kind: "act" }>["action"];

/** Un comando sul testo già scritto: selezione, modifica, formato. */
function applyAct(editor: Editor, a: Exclude<Act, ControlAction | { type: "list" }>, o: ApplyOptions) {
  const before = textBefore(editor);
  const pos = editor.state.selection.from;
  // Converte una posizione nella stringa `before` in una posizione nel documento.
  const abs = (i: number) => pos - (before.length - i);

  if (a.type === "select") {
    if (a.target === "all") editor.chain().focus().selectAll().run();
    else if (a.target === "none") editor.chain().focus().setTextSelection(editor.state.selection.to).run();
    else {
      const r = rangeOfLast(before, a.target);
      if (r) editor.chain().focus().setTextSelection({ from: abs(r.start), to: abs(r.end) }).run();
    }
  } else if (a.type === "edit") {
    if (a.op === "undo") {
      editor.chain().focus().undo().run();
    } else if (a.op === "deleteRange") {
      const r = rangeFromTo(before, a.from ?? "", a.to ?? "");
      if (r) editor.chain().focus().deleteRange({ from: abs(r.start), to: abs(r.end) }).run();
    } else {
      const n = charsToDelete(before, a.op, a.n ?? 1);
      if (n > 0) editor.chain().focus().deleteRange({ from: pos - n, to: pos }).run();
    }
  } else if (a.type === "format") {
    let range: { from: number; to: number } | null = null;
    const last = o.lastInsert.current;
    if (a.target === "that" && last && last.to <= editor.state.doc.content.size) range = last;
    else {
      const r = rangeOfLast(before, a.target === "word" ? "word" : "sentence");
      if (r) range = { from: abs(r.start), to: abs(r.end) };
    }
    if (range) {
      // Niente spazi ai bordi: la formattazione non deve "sporcare" lo spazio fra le parole.
      const t = editor.state.doc.textBetween(range.from, range.to, "\n", "\n");
      range = { from: range.from + (t.length - t.trimStart().length), to: range.to - (t.length - t.trimEnd().length) };
    }
    if (range && range.to > range.from) {
      if (a.mark === "upper" || a.mark === "lower") {
        transformRange(editor, range, a.mark === "upper" ? (t) => t.toUpperCase() : (t) => t.toLowerCase());
      } else {
        const c = editor.chain().focus().setTextSelection(range);
        if (a.mark === "clear") c.unsetAllMarks().setTextSelection(pos).run();
        else c.setMark(a.mark).setTextSelection(pos).unsetMark(a.mark).run();
      }
    }
  }
}

/** Parole e simboli di una frase: un pezzo alla volta, così se un comando non può essere eseguito gli altri restano validi. */
function insertRun(editor: Editor, tokens: Parameters<typeof compose>[0], o: ApplyOptions) {
  const startPos = editor.state.selection.from;
  const segs = compose(tokens, textBefore(editor));
  // Punto automatico (facoltativo): solo se la frase finisce con una parola.
  if (o.autoPeriod && tokens[tokens.length - 1]?.kind === "word") {
    const lastSeg = segs[segs.length - 1];
    if (lastSeg && lastSeg.kind === "text") lastSeg.text += ".";
    else segs.push({ kind: "text", text: "." });
  }
  for (const seg of segs) {
    const c = editor.chain().focus();
    if (seg.kind === "text") c.insertContent(seg.text).run();
    else if (seg.paragraph) {
      // dentro un elenco "nuovo paragrafo" crea la voce successiva
      if (editor.isActive("listItem")) c.splitListItem("listItem").run();
      else c.splitBlock().run();
    } else c.setHardBreak().run();
  }
  const endPos = editor.state.selection.to;
  if (endPos > startPos) o.lastInsert.current = { from: startPos, to: endPos };
}

export function applyTranscript(editor: Editor, transcript: string, o: ApplyOptions) {
  let text = transcript;
  if (o.cleanFillers) text = stripFillers(text, o.dictLang);
  if (o.cleanRepeats) text = dedupeRepeats(text);
  let steps = parseTranscript(text, COMMANDS[o.dictLang], SYNTAX[o.dictLang], o.dictionary);
  if (o.paused) {
    steps = steps.filter(
      (st) => st.kind === "act" && st.action.type === "control" && (st.action.op === "resume" || st.action.op === "stop"),
    );
  }
  for (const step of steps) {
    // Ogni frase detta è un passo a sé per "annulla", anche se arriva subito dopo un'altra.
    editor.view.dispatch(closeHistory(editor.state.tr));

    if (step.kind === "run") {
      insertRun(editor, step.tokens, o);
      continue;
    }
    const a = step.action;
    if (a.type === "control") o.onControl(a);
    else if (a.type === "list") {
      if (a.kind === "bullet") editor.chain().focus().toggleBulletList().run();
      else if (a.kind === "ordered") editor.chain().focus().toggleOrderedList().run();
      else if (!editor.chain().focus().liftListItem("listItem").run()) editor.chain().focus().clearNodes().run();
    } else applyAct(editor, a, o);
  }
}
