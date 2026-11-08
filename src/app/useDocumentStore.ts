// Il documento aperto: salvataggio automatico sul dispositivo e ripresa dell'ultimo documento.
import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Lang } from "../commands/types";
import { strings } from "../i18n";
import { deriveTitle } from "../text/edit";
import { loadLastDocument, saveDocument } from "../store/db";

export type SaveState = "saved" | "saving" | "error";

export function useDocumentStore(dictLang: Lang, uiLang: Lang) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const docId = useRef<string>(crypto.randomUUID());
  const createdAt = useRef(Date.now());
  const loaded = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const langs = useRef({ dictLang, uiLang });
  langs.current = { dictLang, uiLang };

  const persist = useCallback(async (editor: Editor) => {
    setSaveState("saving");
    const ok = await saveDocument({
      id: docId.current,
      title: deriveTitle(editor.getText({ blockSeparator: "\n" }), strings[langs.current.uiLang].defaultTitle),
      content: editor.getJSON(),
      language: langs.current.dictLang,
      createdAt: createdAt.current,
      updatedAt: Date.now(),
    });
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

  /** Salva subito (prima di una copia di sicurezza o di un aggiornamento). */
  const flush = useCallback(
    async (editor: Editor | null) => {
      window.clearTimeout(saveTimer.current);
      return editor ? persist(editor) : true;
    },
    [persist],
  );

  /** Rimette nell'editor l'ultimo documento salvato. Da qui in poi le modifiche si salvano da sole. */
  const loadLast = useCallback(async (editor: Editor) => {
    const last = await loadLastDocument();
    if (last) {
      docId.current = last.id;
      createdAt.current = last.createdAt;
      editor.commands.setContent(last.content as never, false);
    }
    loaded.current = true;
  }, []);

  return { saveState, persist, onEdit, flush, loadLast };
}
