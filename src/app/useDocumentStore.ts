// Il documento aperto: salvataggio automatico sul dispositivo, apertura di un altro documento, ripresa dell'ultimo.
import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Lang } from "../commands/types";
import { strings } from "../i18n";
import { deriveTitle } from "../text/edit";
import { checkDatabase, saveDocument, type DocumentRow } from "../store/db";
import { loadCurrentDocument, markOpened, purgeExpired } from "../store/documents";
import { replaceDocument } from "./editorSwap";

export type SaveState = "saved" | "saving" | "error";

export function useDocumentStore(dictLang: Lang, uiLang: Lang, onSwitched: (editor: Editor) => void) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [currentId, setCurrentId] = useState("");
  /** il nome scelto dall'utente per il documento aperto (nessuno = viene dalle prime parole) */
  const [customTitle, setCustomTitleState] = useState<string | null>(null);
  /** perché il database non si apre (se non si apre); finché c'è, niente viene salvato */
  const [problem, setProblem] = useState<string | null>(null);

  const docId = useRef<string>(crypto.randomUUID());
  const createdAt = useRef(Date.now());
  const custom = useRef<string | null>(null);
  const loaded = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const langs = useRef({ dictLang, uiLang });
  langs.current = { dictLang, uiLang };

  const setCustom = useCallback((title: string | null) => {
    custom.current = title;
    setCustomTitleState(title);
  }, []);

  const persist = useCallback(async (editor: Editor) => {
    setSaveState("saving");
    const derived = deriveTitle(editor.getText({ blockSeparator: "\n" }), strings[langs.current.uiLang].defaultTitle);
    const row: DocumentRow = {
      id: docId.current,
      title: custom.current ?? derived,
      content: editor.getJSON(),
      language: langs.current.dictLang,
      createdAt: createdAt.current,
      updatedAt: Date.now(),
    };
    if (custom.current !== null) row.titleCustom = true;
    const ok = await saveDocument(row);
    setSaveState(ok ? "saved" : "error");
    return ok;
  }, []);

  /** Dopo ogni modifica: salva tra 600 millisecondi (se non ne arrivano altre). */
  const onEdit = useCallback(
    (editor: Editor) => {
      if (!loaded.current) return;
      setSaveState("saving");
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void persist(editor), 600);
    },
    [persist],
  );

  /** Salva subito (prima di una copia di sicurezza, di un aggiornamento o di cambiare documento). */
  const flush = useCallback(
    async (editor: Editor | null) => {
      window.clearTimeout(saveTimer.current);
      if (!editor || !loaded.current) return true;
      return persist(editor);
    },
    [persist],
  );

  const show = useCallback(
    (editor: Editor, row: DocumentRow | null) => {
      window.clearTimeout(saveTimer.current);
      docId.current = row?.id ?? crypto.randomUUID();
      createdAt.current = row?.createdAt ?? Date.now();
      setCurrentId(docId.current);
      setCustom(row?.titleCustom ? row.title : null);
      replaceDocument(editor, row?.content ?? null);
      setSaveState("saved");
      onSwitched(editor);
    },
    [onSwitched, setCustom],
  );

  /** All'avvio: controlla che il database si apra, toglie dal cestino ciò che è scaduto, riapre l'ultimo documento. */
  const loadLast = useCallback(
    async (editor: Editor) => {
      const status = await checkDatabase();
      if (!status.ok) {
        // Non si tocca niente e non si salva niente: i dati restano dove sono.
        setProblem(status.error);
        return;
      }
      try {
        await purgeExpired();
      } catch (e) {
        console.warn("non sono riuscito a svuotare il cestino scaduto", e);
      }
      const last = await loadCurrentDocument();
      if (last) show(editor, last);
      else setCurrentId(docId.current);
      loaded.current = true;
    },
    [show],
  );

  /** Apre un documento dell'elenco. Prima salva quello aperto. */
  const open = useCallback(
    async (editor: Editor, row: DocumentRow) => {
      if (!(await flush(editor))) throw new Error("salvataggio non riuscito");
      await markOpened(row.id);
      show(editor, row);
    },
    [flush, show],
  );

  /** Un documento vuoto. Entra nell'elenco solo quando ci si scrive qualcosa. */
  const createBlank = useCallback(
    async (editor: Editor) => {
      if (!(await flush(editor))) throw new Error("salvataggio non riuscito");
      show(editor, null);
    },
    [flush, show],
  );

  /** Il documento aperto è stato tolto (cestino o eliminato): si apre l'ultimo rimasto, o uno vuoto. */
  const afterRemoval = useCallback(
    async (editor: Editor) => {
      const next = await loadCurrentDocument();
      if (next) await markOpened(next.id);
      show(editor, next ?? null);
    },
    [show],
  );

  return { saveState, currentId, customTitle, setCustomTitle: setCustom, problem, persist, onEdit, flush, loadLast, open, createBlank, afterRemoval };
}
