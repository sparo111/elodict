import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import { closeHistory } from "@tiptap/pm/history";
import { Toolbar } from "./components/Toolbar";
import { AlertTriangle, Download, HelpCircle, Mail, Mic, Settings, Square } from "lucide-react";
import { strings } from "./i18n";
import { COMMANDS, VOICE_CODE } from "./commands";
import type { Lang } from "./commands/types";
import { compose, parseTranscript } from "./commands/parser";
import { charsToDelete, deriveTitle, rangeFromTo, rangeOfLast } from "./text/edit";
import { SYNTAX } from "./commands/syntax";
import { dedupeRepeats, stripFillers, type DictEntry } from "./text/clean";
import {
  createRecognizer,
  isSpeechSupported,
  type RecognizerError,
  type RecognizerState,
} from "./speech/recognizer";
import { docToBlocks, toText } from "./export/blocks";
import {
  defaultLang,
  exportBackup,
  loadLastDocument,
  loadSettings,
  restoreBackup,
  saveDocument,
  saveSettings,
  type SettingsRow,
} from "./store/db";
import { parseBackup } from "./store/backup";
import { downloadFile } from "./export/build";
import { ExportDialog, HelpDialog, SendDialog, SettingsDialog } from "./components/Dialogs";

type SaveState = "saved" | "saving" | "error";

/** Il testo del paragrafo prima del cursore (serve per spazi e maiuscole). */
function textBefore(editor: Editor): string {
  const { $from } = editor.state.selection;
  return $from.parent.textBetween(0, $from.parentOffset, "\n", "\n").slice(-400);
}

/** Cambia le maiuscole di un tratto di testo senza perdere grassetto, corsivo ecc. */
function transformRange(editor: Editor, range: { from: number; to: number }, fn: (t: string) => string) {
  const { state } = editor;
  const pieces: { start: number; end: number; text: string; marks: readonly import("@tiptap/pm/model").Mark[] }[] = [];
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

export function App() {
  const supported = isSpeechSupported();
  const [dictLang, setDictLang] = useState<Lang>(defaultLang());
  const [uiLang, setUiLang] = useState<Lang>(defaultLang());
  const s = strings[uiLang];
  const [cleanFillers, setCleanFillers] = useState(true);
  const [cleanRepeats, setCleanRepeats] = useState(false);
  const [autoPeriod, setAutoPeriod] = useState(false);
  const [dictionary, setDictionary] = useState<DictEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const setPausedBoth = (v: boolean) => {
    pausedRef.current = v;
    setPaused(v);
  };

  const [state, setState] = useState<RecognizerState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<RecognizerError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dialog, setDialog] = useState<null | "settings" | "help" | "export" | "send">(null);
  const [tryText, setTryText] = useState("");
  const [activity, setActivity] = useState(0);
  const [noText, setNoText] = useState(false);
  const stateRef = useRef<RecognizerState>("idle");
  stateRef.current = state;
  const resumeAfterSwitch = useRef(false);

  const docId = useRef<string>(crypto.randomUUID());
  const createdAt = useRef(Date.now());
  const loaded = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);

  const persist = useCallback(
    async (editor: Editor) => {
      setSaveState("saving");
      const ok = await saveDocument({
        id: docId.current,
        title: deriveTitle(editor.getText({ blockSeparator: "\n" }), strings[uiLang].defaultTitle),
        content: editor.getJSON(),
        language: dictLang,
        createdAt: createdAt.current,
        updatedAt: Date.now(),
      });
      setSaveState(ok ? "saved" : "error");
    },
    [dictLang, uiLang],
  );

  const editor = useEditor({
    extensions: [StarterKit, UnderlineExt],
    content: "",
    editorProps: { attributes: { "aria-label": "Documento", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
      if (!loaded.current) return;
      setSaveState("saving");
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void persist(editor), 600);
    },
  });

  // Rilegge impostazioni e ultimo documento dal salvataggio del browser.
  const hydrate = useCallback(async () => {
    if (!editor) return;
    const [settings, last] = await Promise.all([loadSettings(), loadLastDocument()]);
    setDictLang(settings.dictationLanguage);
    setUiLang(settings.uiLanguage);
    setCleanFillers(settings.cleanFillers);
    setCleanRepeats(settings.cleanRepeats);
    setAutoPeriod(settings.autoPeriod);
    setDictionary(settings.dictionary);
    if (last) {
      docId.current = last.id;
      createdAt.current = last.createdAt;
      editor.commands.setContent(last.content as never, false);
      setIsEmpty(editor.isEmpty);
    }
    loaded.current = true;
  }, [editor]);

  // All'avvio: recupera impostazioni e ultimo documento salvato.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Copia di sicurezza: scarica tutto in un file / ripristina da un file.
  const backupNow = async () => {
    if (editor) await persist(editor); // salva subito l'ultima modifica
    const json = await exportBackup();
    const day = new Date().toISOString().slice(0, 10);
    downloadFile(new File([json], `elodict-copia-${day}.json`, { type: "application/json" }));
    flash(s.backupDone);
  };
  const restoreNow = async (file: File): Promise<number | null> => {
    try {
      const n = await restoreBackup(parseBackup(await file.text()));
      await hydrate();
      return n;
    } catch {
      return null;
    }
  };

  useEffect(() => { document.documentElement.lang = uiLang; }, [uiLang]);

  // Cambia una o più impostazioni e le salva sul dispositivo.
  const savePrefs = (over: Partial<Omit<SettingsRow, "id">>) => {
    const next: SettingsRow = {
      id: "main",
      dictationLanguage: dictLang,
      uiLanguage: uiLang,
      cleanFillers,
      cleanRepeats,
      autoPeriod,
      dictionary,
      ...over,
    };
    setDictLang(next.dictationLanguage);
    setUiLang(next.uiLanguage);
    setCleanFillers(next.cleanFillers);
    setCleanRepeats(next.cleanRepeats);
    setAutoPeriod(next.autoPeriod);
    setDictionary(next.dictionary);
    void saveSettings(next);
  };
  const savePrefsRef = useRef(savePrefs);
  savePrefsRef.current = savePrefs;

  // Applica una frase (detta o scritta nella casella di prova).
  // Ultimo testo scritto a voce: serve per "grassetto questo".
  const lastInsert = useRef<{ from: number; to: number } | null>(null);

  const applyTranscript = useCallback(
    (transcript: string) => {
      if (!editor) return;
      let text = transcript;
      if (cleanFillers) text = stripFillers(text, dictLang);
      if (cleanRepeats) text = dedupeRepeats(text);
      let steps = parseTranscript(text, COMMANDS[dictLang], SYNTAX[dictLang], dictionary);
      if (pausedRef.current) {
        // In pausa si ascoltano solo i comandi "riprendi" e "ferma".
        steps = steps.filter(
          (st) => st.kind === "act" && st.action.type === "control" && (st.action.op === "resume" || st.action.op === "stop"),
        );
      }
      for (const step of steps) {
        // Ogni frase detta è un passo a sé per "annulla", anche se arriva subito dopo un'altra.
        editor.view.dispatch(closeHistory(editor.state.tr));

        if (step.kind === "act") {
          const a = step.action;
          if (a.type === "control") {
            if (a.op === "pause") setPausedBoth(true);
            else if (a.op === "resume") setPausedBoth(false);
            else if (a.op === "switchLang") savePrefsRef.current({ dictationLanguage: a.lang });
            else if (a.op === "showHelp") setDialog("help");
            else recRef.current?.stop();
            continue;
          }
          if (a.type === "list") {
            if (a.kind === "bullet") editor.chain().focus().toggleBulletList().run();
            else if (a.kind === "ordered") editor.chain().focus().toggleOrderedList().run();
            else if (!editor.chain().focus().liftListItem("listItem").run()) editor.chain().focus().clearNodes().run();
            continue;
          }
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
            const last = lastInsert.current;
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
          continue;
        }

        // Un pezzo alla volta: se un comando non può essere eseguito, gli altri restano validi.
        const startPos = editor.state.selection.from;
        const segs = compose(step.tokens, textBefore(editor));
        // Punto automatico (facoltativo): solo se la frase finisce con una parola.
        if (autoPeriod && step.tokens[step.tokens.length - 1]?.kind === "word") {
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
        if (endPos > startPos) lastInsert.current = { from: startPos, to: endPos };
      }
    },
    [editor, dictLang, cleanFillers, cleanRepeats, autoPeriod, dictionary],
  );

  const applyRef = useRef(applyTranscript);
  applyRef.current = applyTranscript;

  // Il microfono si ricrea quando cambia la lingua.
  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  useEffect(() => {
    if (!supported) return;
    // Se la lingua cambia mentre si sta ascoltando, il vecchio microfono si spegne e quello nuovo riparte.
    let alive = true;
    const rec = createRecognizer(VOICE_CODE[dictLang], {
      onInterim: (t) => {
        if (!alive) return;
        setInterim(pausedRef.current ? "" : t);
        if (t) setActivity((n) => n + 1);
      },
      onFinal: (text) => {
        if (!alive) return;
        if (text.trim()) setActivity((n) => n + 1);
        applyRef.current(text);
      },
      onState: (st) => {
        if (!alive) return;
        setState(st);
        if (st === "idle") setPausedBoth(false);
      },
      onError: (e) => {
        if (alive) setError(e);
      },
    });
    recRef.current = rec;
    if (resumeAfterSwitch.current) {
      resumeAfterSwitch.current = false;
      rec.start();
    }
    return () => {
      alive = false;
      resumeAfterSwitch.current = stateRef.current !== "idle";
      rec.stop();
      if (recRef.current === rec) recRef.current = null;
    };
  }, [supported, dictLang]);

  const toggle = () => {
    if (state === "idle") {
      setError(null);
      recRef.current?.start();
    } else {
      recRef.current?.stop();
    }
  };

  // Ascolta ma non arriva testo da un po': avvisa e dice cosa controllare.
  useEffect(() => {
    setNoText(false);
    if (state !== "listening" || paused) return;
    const id = window.setTimeout(() => setNoText(true), 10000);
    return () => window.clearTimeout(id);
  }, [state, paused, activity]);

  // Scorciatoie: Alt+Maiusc+D avvia/ferma, Esc ferma.
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === "KeyD") {
        e.preventDefault();
        toggleRef.current();
      } else if (e.key === "Escape" && state !== "idle" && !document.querySelector("dialog[open]")) {
        recRef.current?.stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const getDoc = () => editor?.getJSON() ?? { type: "doc", content: [] };
  const plainText = () => toText(docToBlocks(getDoc()));
  const title = deriveTitle(editor?.getText({ blockSeparator: "\n" }) ?? "", s.defaultTitle);
  const active = state !== "idle";

  const iconBtn =
    "inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-surface sm:px-3";

  return (
    <div className="flex min-h-full flex-col bg-bg text-text">
      <header className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
        <h1 className="text-lg">{s.appName}</h1>
        <nav className="flex items-center gap-1">
          <button type="button" className={iconBtn} onClick={() => setDialog("send")} aria-label={s.send}>
            <Mail size={18} aria-hidden="true" /><span className="hidden sm:inline">{s.send}</span>
          </button>
          <button type="button" className={iconBtn} onClick={() => setDialog("export")} aria-label={s.export}>
            <Download size={18} aria-hidden="true" /><span className="hidden sm:inline">{s.export}</span>
          </button>
          <button type="button" className={iconBtn} onClick={() => setDialog("help")} aria-label={s.help}>
            <HelpCircle size={18} aria-hidden="true" /><span className="hidden sm:inline">{s.help}</span>
          </button>
          <button type="button" className={iconBtn} onClick={() => setDialog("settings")} aria-label={s.settings}>
            <Settings size={18} aria-hidden="true" /><span className="hidden sm:inline">{s.settings}</span>
          </button>
        </nav>
      </header>

      {editor && (
        <Toolbar
          editor={editor}
          s={s}
          listening={active}
          micDisabled={!supported}
          onMic={toggle}
          lang={dictLang}
          onLang={(l) => savePrefs({ dictationLanguage: l })}
        />
      )}

      <main className="mx-auto flex w-full max-w-editor flex-1 flex-col px-4">
        {!supported && (
          <div role="alert" className="mt-4 flex gap-3 rounded-md bg-warning-soft p-4 text-warning">
            <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{s.unsupportedTitle}</p>
              <p className="text-sm">{s.unsupportedBody}</p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-md border border-danger p-4 text-danger">
            <p className="text-sm">{s.errors[error]}</p>
            {error !== "no-speech" ? (
              <button type="button" onClick={toggle} className="shrink-0 text-sm font-semibold underline">
                {s.retry}
              </button>
            ) : (
              <button type="button" onClick={() => setDialog("settings")} className="shrink-0 text-sm font-semibold underline">
                {s.noTextAction}
              </button>
            )}
          </div>
        )}

        {noText && !error && (
          <div role="status" className="mt-4 flex items-start justify-between gap-3 rounded-md bg-accent-soft p-4 text-text">
            <p className="text-sm">{s.noText}</p>
            <button type="button" onClick={() => setDialog("settings")} className="shrink-0 text-sm font-semibold text-accent underline">
              {s.noTextAction}
            </button>
          </div>
        )}

        <div className="doc-editor relative flex-1">
          {isEmpty && (
            <p className="pointer-events-none absolute left-0 top-6 max-w-md font-document text-doc text-muted">
              {s.placeholder}
            </p>
          )}
          <EditorContent editor={editor} />
        </div>

        <p className="min-h-6 pb-2 font-document text-doc italic text-muted" aria-hidden="true">{interim}</p>

        <details className="mb-3 rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">{s.tryTitle}</summary>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (tryText.trim()) applyTranscript(tryText);
              setTryText("");
            }}
          >
            <label htmlFor="try" className="text-sm text-muted">{s.tryHelp}</label>
            <div className="flex gap-2">
              <input
                id="try"
                value={tryText}
                onChange={(e) => setTryText(e.target.value)}
                placeholder={s.tryPlaceholder}
                className="h-10 min-w-0 flex-1 rounded-md border border-border-input bg-bg px-3"
              />
              <button type="submit" className="h-10 shrink-0 rounded-md border border-border-input px-4 text-sm font-semibold hover:bg-surface">
                {s.tryButton}
              </button>
            </div>
          </form>
        </details>

        <p className="pb-2 text-sm text-muted">{s.hint}</p>
        <p className="pb-1 text-xs text-muted" role="status">
          {saveState === "saved" ? s.saved : saveState === "saving" ? s.saving : s.saveError}
        </p>
        <p className="pb-1 text-xs text-muted">{s.backupHint}</p>
        <p className="pb-28 text-xs text-muted">{s.privacy}</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 border-t border-border bg-bg px-4 py-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {paused ? s.paused : state === "listening" ? s.listening : state === "starting" ? s.starting : " "}
          {paused && (
            <button type="button" onClick={() => setPausedBoth(false)} className="ml-3 font-semibold text-accent underline">
              {s.resume}
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={toggle}
          disabled={!supported}
          aria-pressed={active}
          className={`inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50 ${
            active ? "bg-recording" : "bg-accent"
          }`}
        >
          {active ? (
            <>
              <Square size={18} aria-hidden="true" />
              {s.stop}
              <span className="pulse-dot h-2 w-2 rounded-pill bg-on-accent" aria-hidden="true" />
            </>
          ) : (
            <>
              <Mic size={20} aria-hidden="true" />
              {s.talk}
            </>
          )}
        </button>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-md bg-text px-4 py-2 text-sm text-bg shadow-pop">
          {toast}
        </div>
      )}

      <SettingsDialog
        open={dialog === "settings"}
        onClose={() => setDialog(null)}
        s={s}
        value={{ dictationLanguage: dictLang, uiLanguage: uiLang, cleanFillers, cleanRepeats, autoPeriod, dictionary }}
        onChange={savePrefs}
        onBackup={backupNow}
        onRestore={restoreNow}
      />
      <HelpDialog open={dialog === "help"} onClose={() => setDialog(null)} s={s} dictationLang={dictLang} />
      <ExportDialog
        open={dialog === "export"}
        onClose={() => setDialog(null)}
        s={s}
        getDoc={getDoc}
        title={title}
        isEmpty={isEmpty}
        docLang={dictLang}
        onDone={flash}
      />
      <SendDialog
        open={dialog === "send"}
        onClose={() => setDialog(null)}
        s={s}
        getDoc={getDoc}
        title={title}
        isEmpty={isEmpty}
        docLang={dictLang}
        plainText={plainText}
      />
    </div>
  );
}
