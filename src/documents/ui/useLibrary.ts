// L'elenco dei documenti e le azioni su di essi (apri, nuovo, rinomina, duplica, cestino), tenendo allineato il documento aperto.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { DocumentRow } from "../../store/db";
import {
  countDocuments,
  deleteForever,
  duplicateDocument,
  listDocuments,
  listTrash,
  MAX_DOCUMENTS,
  renameDocument,
  restoreDocument,
  trashDocument,
} from "../../store/documents";
import { plainTextOf, previewOf } from "../plainText";
import { matches, snippetOf, type Snippet } from "../search";

export interface DocItem {
  row: DocumentRow;
  preview: string;
  snippet: Snippet | null;
}

/** Quello che serve a tenere allineato il documento aperto (viene da `useDocumentStore`). */
export interface OpenDocumentControl {
  currentId: string;
  open: (editor: Editor, row: DocumentRow) => Promise<void>;
  createBlank: (editor: Editor) => Promise<void>;
  afterRemoval: (editor: Editor) => Promise<void>;
  setCustomTitle: (title: string | null) => void;
}

export type LibraryError = "limit" | "failed";

export function useLibrary(opts: { active: boolean; editor: Editor | null; control: OpenDocumentControl; copySuffix: string }) {
  const { active, editor, control, copySuffix } = opts;
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [trash, setTrash] = useState<DocumentRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<LibraryError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [live, bin] = await Promise.all([listDocuments(), listTrash()]);
      setRows(live);
      setTrash(bin);
    } catch (e) {
      console.warn("non riesco a leggere l'elenco dei documenti", e);
      setError("failed");
    }
  }, []);

  // L'elenco si rilegge ogni volta che la finestra si apre.
  useEffect(() => {
    if (active) {
      setError(null);
      setQuery("");
      void refresh();
    }
  }, [active, refresh]);

  const items = useMemo<DocItem[]>(() => {
    return rows.flatMap((row) => {
      const text = plainTextOf(row.content);
      if (!matches(row.title, text, query)) return [];
      return [{ row, preview: previewOf(text), snippet: snippetOf(text, query) }];
    });
  }, [rows, query]);

  /** Esegue un'azione; dopo, rilegge l'elenco. Un errore si mostra, non si nasconde. Dice se è riuscita (`false` anche per il limite). */
  const run = useCallback(
    async (action: () => Promise<boolean | void>) => {
      setError(null);
      let ok = true;
      try {
        ok = (await action()) !== false;
      } catch (e) {
        console.warn("operazione sui documenti non riuscita", e);
        setError("failed");
        ok = false;
      }
      await refresh();
      return ok;
    },
    [refresh],
  );

  const atLimit = async () => (await countDocuments()) >= MAX_DOCUMENTS;

  return {
    items,
    trash,
    total: rows.length,
    query,
    setQuery,
    error,
    open: (row: DocumentRow) => (editor ? run(() => control.open(editor, row)) : Promise.resolve(false)),
    create: () =>
      editor
        ? run(async () => {
            if (await atLimit()) {
              setError("limit");
              return false;
            }
            await control.createBlank(editor);
          })
        : Promise.resolve(false),
    rename: (row: DocumentRow, title: string) =>
      run(async () => {
        await renameDocument(row.id, title);
        if (row.id === control.currentId) control.setCustomTitle(title.trim());
      }),
    duplicate: (row: DocumentRow) =>
      run(async () => {
        if (await atLimit()) {
          setError("limit");
          return false;
        }
        await duplicateDocument(row.id, copySuffix);
      }),
    toTrash: (row: DocumentRow) =>
      run(async () => {
        await trashDocument(row.id);
        if (row.id === control.currentId && editor) await control.afterRemoval(editor);
      }),
    restore: (row: DocumentRow) => run(() => restoreDocument(row.id)),
    deleteForever: (row: DocumentRow) => run(() => deleteForever(row.id)),
  };
}
