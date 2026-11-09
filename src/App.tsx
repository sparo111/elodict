import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import { Toolbar } from "./components/Toolbar";
import { perfEnabled } from "./perf/perf";
import { Paper, type Zoom } from "./components/Paper";
import { InstallBanner } from "./install/Install";
import { DatabaseNotice } from "./documents/ui/DatabaseNotice";
import { DatabaseProblem } from "./documents/ui/DatabaseProblem";
import { UpdateBanner } from "./pwa/UpdateBanner";
import { useAppUpdate } from "./pwa/useAppUpdate";
import { PageLayout } from "./editor/PageLayout";
import { strings } from "./i18n";
import { deriveTitle } from "./text/edit";
import type { ControlAction } from "./commands/types";
import { applyTranscript } from "./app/applyTranscript";
import { AppDialogs } from "./app/AppDialogs";
import { Header, type DialogName } from "./app/Header";
import { Notices } from "./app/Notices";
import { TalkBar } from "./app/TalkBar";
import { openTryBox, TryBox } from "./app/TryBox";
import { useBackupActions } from "./app/useBackupActions";
import { useDictation } from "./app/useDictation";
import { useDocumentStore } from "./app/useDocumentStore";
import { useSettings } from "./app/useSettings";
import { useToast } from "./app/useToast";

// Riquadro dei tempi del riconoscimento (T013b): esiste solo nelle build di prova, e si vede solo con ?perf=1
const PerfPanel = __ELODICT_TEST_HOOKS__ ? lazy(() => import("./perf/PerfPanel")) : null;

export function App() {
  const settings = useSettings();
  const { prefs } = settings;
  const s = strings[prefs.uiLanguage];
  const { toast, flash } = useToast();

  const [isEmpty, setIsEmpty] = useState(true);
  const lastInsert = useRef<{ from: number; to: number } | null>(null);
  // quando nell'editor entra un altro documento: il vuoto si ricalcola e «grassetto questo» riparte da zero
  const onSwitched = useCallback((ed: Editor) => {
    setIsEmpty(ed.isEmpty);
    lastInsert.current = null;
  }, []);
  const store = useDocumentStore(prefs.dictationLanguage, prefs.uiLanguage, onSwitched);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const scaleRef = useRef(1);
  const [dialog, setDialog] = useState<DialogName | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, UnderlineExt, PageLayout.configure({ onPages: setPages, getScale: () => scaleRef.current })],
    content: "",
    editorProps: { attributes: { "aria-label": "Documento", role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty);
      store.onEdit(editor);
    },
  });

  // Rilegge impostazioni e ultimo documento dal salvataggio del browser.
  const { load: loadSettings } = settings;
  const { loadLast } = store;
  const hydrate = useCallback(async () => {
    if (!editor) return;
    await Promise.all([loadSettings(), loadLast(editor)]);
    setIsEmpty(editor.isEmpty);
  }, [editor, loadSettings, loadLast]);

  // All'avvio: recupera impostazioni e ultimo documento salvato.
  // Una volta sola per editor: in sviluppo React avvia gli effetti due volte, e il secondo caricamento,
  // arrivando dopo una scelta dell'utente, la sovrascriverebbe (BUG-005).
  const hydratedFor = useRef<Editor | null>(null);
  useEffect(() => {
    if (!editor || hydratedFor.current === editor) return;
    hydratedFor.current = editor;
    void hydrate();
  }, [editor, hydrate]);

  // mentre un'altra scheda tiene il database, qui non si scrive: niente da perdere
  useEffect(() => {
    editor?.setEditable(store.dbNotice === null);
  }, [editor, store.dbNotice]);
  useEffect(() => { document.documentElement.lang = prefs.uiLanguage; }, [prefs.uiLanguage]);
  useEffect(() => {
    editor?.view.dom.setAttribute("aria-label", s.editorLabel);
  }, [editor, s.editorLabel]);

  // Dettatura: il testo riconosciuto passa da applyTranscript (sempre con le impostazioni di adesso).
  const onTextRef = useRef<(text: string) => void>(() => undefined);
  const dictation = useDictation({
    engine: prefs.engine,
    dictLang: prefs.dictationLanguage,
    whisperModel: prefs.whisperModel,
    micId: prefs.microphoneId,
    onTextRef,
  });
  const onControl = (a: ControlAction) => {
    if (a.op === "pause") dictation.setPaused(true);
    else if (a.op === "resume") dictation.setPaused(false);
    else if (a.op === "switchLang") settings.save({ dictationLanguage: a.lang });
    else if (a.op === "showHelp") setDialog("help");
    else dictation.stop();
  };
  const apply = (text: string) => {
    if (!editor) return;
    applyTranscript(editor, text, {
      dictLang: prefs.dictationLanguage,
      cleanFillers: prefs.cleanFillers,
      cleanRepeats: prefs.cleanRepeats,
      autoPeriod: prefs.autoPeriod,
      dictionary: prefs.dictionary,
      paused: dictation.pausedRef.current,
      lastInsert,
      onControl,
    });
  };
  onTextRef.current = apply;

  const backup = useBackupActions({
    editor,
    flush: store.flush,
    reload: hydrate,
    onDone: () => flash(s.backupDone),
    onTooBig: (reason) => flash(reason === "too-many" ? s.backupTooMany : s.backupTooBig, 10_000),
  });

  // «Nuova versione pronta»: prima di ricaricare si salva il documento.
  const { flush } = store;
  const saveBeforeUpdate = useCallback(() => flush(editor), [flush, editor]);
  const update = useAppUpdate(saveBeforeUpdate);

  const title = store.customTitle ?? deriveTitle(editor?.getText({ blockSeparator: "\n" }) ?? "", s.defaultTitle);

  return (
    <div className="flex min-h-full flex-col bg-bg text-text">
      {__ELODICT_TEST_HOOKS__ && PerfPanel && perfEnabled() && (
        <Suspense fallback={null}>
          <PerfPanel />
        </Suspense>
      )}
      {store.problem && <DatabaseProblem s={s} />}
      {store.dbNotice && <DatabaseNotice s={s} kind={store.dbNotice} />}
      <UpdateBanner s={s} ready={update.ready} busy={update.busy} saveFailed={update.saveFailed} onApply={() => void update.apply()} onLater={update.later} />
      <InstallBanner s={s} enabled={settings.ready && prefs.onboardingDone} />
      <Header
        s={s}
        uiLang={prefs.uiLanguage}
        onLang={(l) => settings.save({ uiLanguage: l, dictationLanguage: l })}
        onOpen={setDialog}
      />

      {editor && (
        <Toolbar
          editor={editor}
          s={s}
          listening={dictation.active}
          micDisabled={!dictation.supported}
          onMic={dictation.toggle}
          lang={prefs.dictationLanguage}
          onLang={(l) => settings.save({ dictationLanguage: l })}
          zoom={zoom}
          onZoom={setZoom}
        />
      )}

      <main className="flex w-full flex-1 flex-col">
        <Notices
          s={s}
          supported={dictation.supported}
          engine={prefs.engine}
          error={dictation.error}
          notice={dictation.notice}
          noText={dictation.noText}
          onRetry={dictation.toggle}
          onOpenSettings={() => setDialog("settings")}
        />

        <Paper editor={editor} pages={pages} zoom={zoom} scaleRef={scaleRef} isEmpty={isEmpty} placeholder={s.placeholder} />

        <div className="mx-auto w-full max-w-editor px-4 pt-3">
          <p className="min-h-6 pb-2 font-document text-doc italic text-muted" aria-hidden="true">{dictation.interim}</p>
          <TryBox s={s} onSubmit={apply} />
          <p className="pb-2 text-sm text-muted">{s.hint}</p>
          <p className="pb-1 text-xs text-muted" role="status">
            {store.saveState === "saved" ? s.saved : store.saveState === "saving" ? s.saving : s.saveError}
          </p>
          <p className="pb-1 text-xs text-muted">{s.backupHint}</p>
          <p className="pb-28 text-xs text-muted">{prefs.engine === "offline" ? s.privacyOffline : s.privacy}</p>
        </div>
      </main>

      <TalkBar
        s={s}
        state={dictation.state}
        paused={dictation.paused}
        loadPct={dictation.loadPct}
        supported={dictation.supported}
        onToggle={dictation.toggle}
        onResume={() => dictation.setPaused(false)}
      />

      {toast && (
        <div role="status" className="fixed bottom-28 left-1/2 -translate-x-1/2 rounded-md bg-text px-4 py-2 text-sm text-bg shadow-pop">
          {toast}
        </div>
      )}

      <AppDialogs
        s={s}
        editor={editor}
        prefs={prefs}
        dialog={dialog}
        onClose={() => setDialog(null)}
        title={title}
        isEmpty={isEmpty}
        settingsReady={settings.ready}
        onChange={settings.save}
        onBackup={backup.backup}
        onRestore={backup.restore}
        onRedoSetup={() => {
          setDialog(null);
          settings.redoOnboarding();
        }}
        onFinishOnboarding={settings.finishOnboarding}
        onTryBox={() => {
          settings.finishOnboarding();
          window.setTimeout(openTryBox, 100);
        }}
        onDone={flash}
        documents={store}
      />
    </div>
  );
}
