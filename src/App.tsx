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
import { charsToDelete, deriveTitle } from "./text/edit";
import {
  createRecognizer,
  isSpeechSupported,
  type RecognizerError,
  type RecognizerState,
} from "./speech/recognizer";
import { docToBlocks, toText } from "./export/blocks";
import { defaultLang, loadLastDocument, loadSettings, saveDocument, saveSettings } from "./store/db";
import { ExportDialog, HelpDialog, SendDialog, SettingsDialog } from "./components/Dialogs";

type SaveState = "saved" | "saving" | "error";

/** Il testo del paragrafo prima del cursore (serve per spazi e maiuscole). */
function textBefore(editor: Editor): string {
  const { $from } = editor.state.selection;
  return $from.parent.textBetween(0, $from.parentOffset, "\n", "\n").slice(-400);
}

export function App() {
  const supported = isSpeechSupported();
  const [dictLang, setDictLang] = useState<Lang>(defaultLang());
  const [uiLang, setUiLang] = useState<Lang>(defaultLang());
  const s = strings[uiLang];

  const [state, setState] = useState<RecognizerState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<RecognizerError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [dialog, setDialog] = useState<null | "settings" | "help" | "export" | "send">(null);
  const [tryText, setTryText] = useState("");

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

  // All'avvio: recupera impostazioni e ultimo documento salvato.
  useEffect(() => {
    if (!editor) return;
    let cancelled = false;
    (async () => {
      const [settings, last] = await Promise.all([loadSettings(), loadLastDocument()]);
      if (cancelled) return;
      setDictLang(settings.dictationLanguage);
      setUiLang(settings.uiLanguage);
      if (last) {
        docId.current = last.id;
        createdAt.current = last.createdAt;
        editor.commands.setContent(last.content as never, false);
        setIsEmpty(editor.isEmpty);
      }
      loaded.current = true;
    })();
    return () => { cancelled = true; };
  }, [editor]);

  useEffect(() => { document.documentElement.lang = uiLang; }, [uiLang]);

  const updateSettings = (d: Lang, u: Lang) => {
    setDictLang(d);
    setUiLang(u);
    void saveSettings({ id: "main", dictationLanguage: d, uiLanguage: u });
  };

  // Applica una frase (detta o scritta nella casella di prova).
  const applyTranscript = useCallback(
    (transcript: string) => {
      if (!editor) return;
      for (const step of parseTranscript(transcript, COMMANDS[dictLang])) {
        // Ogni frase detta è un passo a sé per "annulla", anche se arriva subito dopo un'altra.
        editor.view.dispatch(closeHistory(editor.state.tr));
        if (step.kind === "edit") {
          if (step.op === "undo") {
            editor.chain().focus().undo().run();
          } else {
            const n = charsToDelete(textBefore(editor), step.op);
            const pos = editor.state.selection.from;
            if (n > 0) editor.chain().focus().deleteRange({ from: pos - n, to: pos }).run();
          }
          continue;
        }
        // Un pezzo alla volta: se un comando non può essere eseguito, gli altri restano validi.
        for (const seg of compose(step.tokens, textBefore(editor))) {
          const c = editor.chain().focus();
          if (seg.kind === "text") c.insertContent(seg.text).run();
          else if (seg.paragraph) c.splitBlock().run();
          else c.setHardBreak().run();
        }
      }
    },
    [editor, dictLang],
  );

  const applyRef = useRef(applyTranscript);
  applyRef.current = applyTranscript;

  // Il microfono si ricrea quando cambia la lingua.
  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  useEffect(() => {
    if (!supported) return;
    recRef.current = createRecognizer(VOICE_CODE[dictLang], {
      onInterim: setInterim,
      onFinal: (text) => applyRef.current(text),
      onState: setState,
      onError: setError,
    });
    return () => {
      recRef.current?.stop();
      recRef.current = null;
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
        <Toolbar editor={editor} s={s} listening={active} micDisabled={!supported} onMic={toggle} />
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
            {error !== "no-speech" && (
              <button type="button" onClick={toggle} className="shrink-0 text-sm font-semibold underline">
                {s.retry}
              </button>
            )}
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
        <p className="pb-28 text-xs text-muted">{s.privacy}</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 border-t border-border bg-bg px-4 py-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {state === "listening" ? s.listening : state === "starting" ? s.starting : " "}
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
              {s.dictate}
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
        dictationLang={dictLang}
        uiLang={uiLang}
        onDictationLang={(l) => updateSettings(l, uiLang)}
        onUiLang={(l) => updateSettings(dictLang, l)}
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
