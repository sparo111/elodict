import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Modal } from "../../components/Modal";
import type { Lang } from "../../commands/types";
import type { Strings } from "../../i18n";
import { LiveItem, TrashItem } from "./DocumentItem";
import { useLibrary, type OpenDocumentControl } from "./useLibrary";

interface Props {
  open: boolean;
  onClose: () => void;
  s: Strings;
  lang: Lang;
  editor: Editor | null;
  control: OpenDocumentControl;
}

const btn = "inline-flex min-h-10 items-center gap-2 rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface";

/** «I tuoi documenti»: elenco con ricerca, nuovo, e il cestino. */
export function DocumentsDialog({ open, onClose, s, lang, editor, control }: Props) {
  const lib = useLibrary({ active: open, editor, control, copySuffix: s.docsCopySuffix });
  const [view, setView] = useState<"list" | "trash">("list");
  const now = Date.now();
  useEffect(() => {
    if (open) setView("list");
  }, [open]);

  // aprire un documento chiude l'elenco; le altre azioni lo lasciano aperto
  const openAndClose = async (row: Parameters<typeof lib.open>[0]) => {
    if (await lib.open(row)) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={s.docsTitle} closeLabel={s.close}>
      <div className="flex flex-col gap-3">
        {lib.error && (
          <p role="alert" className="rounded-md border border-danger p-3 text-sm text-danger">
            {lib.error === "limit" ? s.docsLimit : s.docsError}
          </p>
        )}

        {view === "list" ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={`${btn} bg-accent text-on-accent`} onClick={async () => { if (await lib.create()) onClose(); }}>
                <Plus size={16} aria-hidden="true" />
                {s.docsNew}
              </button>
              <button type="button" className={btn} onClick={() => setView("trash")}>
                <Trash2 size={16} aria-hidden="true" />
                {s.docsTrashView.replace("{n}", String(lib.trash.length))}
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="docs-search" className="text-sm font-semibold">{s.docsSearch}</label>
              <input
                id="docs-search"
                type="search"
                value={lib.query}
                onChange={(e) => lib.setQuery(e.target.value)}
                placeholder={s.docsSearchPlaceholder}
                className="h-10 w-full rounded-md border border-border-input bg-bg px-3"
              />
            </div>

            {lib.total === 0 ? (
              <p className="text-sm text-muted">{s.docsEmpty}</p>
            ) : lib.items.length === 0 ? (
              <p role="status" className="text-sm text-muted">{s.docsNoResults.replace("{q}", lib.query.trim())}</p>
            ) : (
              <ul className="divide-y divide-border">
                {lib.items.map((item) => (
                  <LiveItem
                    key={item.row.id}
                    item={item}
                    s={s}
                    lang={lang}
                    current={item.row.id === control.currentId}
                    onOpen={() => void openAndClose(item.row)}
                    onRename={(title) => void lib.rename(item.row, title)}
                    onDuplicate={() => void lib.duplicate(item.row)}
                    onTrash={() => void lib.toTrash(item.row)}
                  />
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div>
              <button type="button" className={btn} onClick={() => setView("list")}>{s.docsBack}</button>
            </div>
            <p className="text-sm text-muted">{s.docsTrashNote}</p>
            {lib.trash.length === 0 ? (
              <p role="status" className="text-sm text-muted">{s.docsTrashEmpty}</p>
            ) : (
              <ul className="divide-y divide-border">
                {lib.trash.map((row) => (
                  <TrashItem key={row.id} row={row} s={s} now={now} onRestore={() => void lib.restore(row)} onDelete={() => void lib.deleteForever(row)} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
