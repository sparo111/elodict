import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AlertTriangle, Download, Mic, Square } from "lucide-react";
import { t } from "./strings";
import { itCommands } from "./commands/it";
import { dictationToSegments } from "./commands/parser";
import {
  createRecognizer,
  isSpeechSupported,
  type RecognizerError,
  type RecognizerState,
} from "./speech/recognizer";
import { downloadTxt } from "./export/txt";

export function App() {
  const supported = isSpeechSupported();
  const [state, setState] = useState<RecognizerState>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<RecognizerError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: { attributes: { "aria-label": "Testo del documento", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => setIsEmpty(editor.isEmpty),
  });

  // Inserisce nel documento una frase definitiva.
  const insertFinal = useCallback(
    (transcript: string) => {
      if (!editor) return;
      const { from } = editor.state.selection;
      const before = editor.state.doc.textBetween(Math.max(0, from - 3), from, "\n", "\n");
      const segments = dictationToSegments(transcript, before, itCommands);
      const chain = editor.chain().focus();
      for (const s of segments) {
        if (s.kind === "text") chain.insertContent(s.text);
        else if (s.paragraph) chain.splitBlock();
        else chain.setHardBreak();
      }
      chain.run();
    },
    [editor],
  );

  // Il riconoscimento chiama sempre l'ultima versione di insertFinal.
  const insertRef = useRef(insertFinal);
  insertRef.current = insertFinal;

  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  useEffect(() => {
    if (!supported) return;
    recRef.current = createRecognizer("it-IT", {
      onInterim: setInterim,
      onFinal: (text) => insertRef.current(text),
      onState: setState,
      onError: setError,
    });
    return () => recRef.current?.stop();
  }, [supported]);

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

  const exportTxt = () => {
    const text = editor?.getText({ blockSeparator: "\n\n" }) ?? "";
    if (!text.trim()) return flash(t.emptyExport);
    const day = new Date().toISOString().slice(0, 10);
    downloadTxt(text, `dettatura-${day}`);
    flash(t.exported);
  };

  const active = state !== "idle";

  return (
    <div className="flex min-h-full flex-col bg-bg text-text">
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <h1 className="text-lg">{t.appName}</h1>
        <button
          type="button"
          onClick={exportTxt}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface"
        >
          <Download size={18} aria-hidden="true" />
          {t.exportTxt}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-editor flex-1 flex-col px-4">
        {!supported && (
          <div role="alert" className="mt-4 flex gap-3 rounded-md bg-warning-soft p-4 text-warning">
            <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t.unsupportedTitle}</p>
              <p className="text-sm">{t.unsupportedBody}</p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-md border border-danger p-4 text-danger">
            <p className="text-sm">{t.errors[error]}</p>
            {error !== "no-speech" && (
              <button type="button" onClick={toggle} className="shrink-0 text-sm font-semibold underline">
                {t.retry}
              </button>
            )}
          </div>
        )}

        <div className="doc-editor relative flex-1">
          {isEmpty && (
            <p className="pointer-events-none absolute left-0 top-6 max-w-md font-document text-doc text-muted">
              {t.placeholder}
            </p>
          )}
          <EditorContent editor={editor} />
        </div>

        <p className="min-h-6 pb-2 font-document text-doc italic text-muted" aria-hidden="true">
          {interim}
        </p>

        <p className="pb-4 text-sm text-muted">{t.hint}</p>
        <p className="pb-24 text-xs text-muted">{t.privacy}</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 border-t border-border bg-bg px-4 py-3">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          {state === "listening" ? t.listening : state === "starting" ? t.starting : " "}
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
              {t.stop}
              <span className="pulse-dot h-2 w-2 rounded-pill bg-on-accent" aria-hidden="true" />
            </>
          ) : (
            <>
              <Mic size={20} aria-hidden="true" />
              {t.dictate}
            </>
          )}
        </button>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-md bg-text px-4 py-2 text-sm text-bg shadow-pop">
          {toast}
        </div>
      )}
    </div>
  );
}
