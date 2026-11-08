import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Modal } from "../Modal";
import type { Lang } from "../../commands/types";
import type { Strings } from "../../i18n";
import { canPickLocation, FORMATS, saveDocumentFile, type ExportFormat } from "../../export/build";

const selectCls = "h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base";

export interface BuildProps {
  getDoc: () => unknown;
  title: string;
  isEmpty: boolean;
  docLang: Lang;
}

export function ExportDialog({ open, onClose, s, getDoc, title, isEmpty, docLang, onDone }: BuildProps & {
  open: boolean; onClose: () => void; s: Strings; onDone: (msg: string) => void;
}) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState(title);

  // Ogni volta che la finestra si apre, il nome proposto è il titolo del documento.
  useEffect(() => {
    if (open) setName(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = async (f: ExportFormat) => {
    if (isEmpty) return onDone(s.emptyExport);
    setBusy(f);
    setFailed(false);
    try {
      const result = await saveDocumentFile(f, name, { doc: getDoc(), title: name, lang: docLang });
      if (result === "cancelled") return;
      onDone(s.exported);
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={s.exportTitle} closeLabel={s.close}>
      <p className="mb-4 text-sm text-muted">{s.exportIntro}</p>
      <label className="mb-4 flex flex-col gap-1 text-sm font-semibold">
        {s.fileName}
        <input className={selectCls} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <p className="mb-4 text-sm text-muted">{canPickLocation() ? s.exportPickNote : s.exportDownloadNote}</p>
      <div className="flex flex-col gap-2">
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            disabled={busy !== null}
            onClick={() => run(f)}
            className="inline-flex h-12 items-center gap-3 rounded-md border border-border-input px-4 text-left font-semibold hover:bg-surface disabled:opacity-50"
          >
            <FileText size={20} aria-hidden="true" />
            {s.fmt[f]}
            {busy === f && <span className="ml-auto text-sm font-normal text-muted">…</span>}
          </button>
        ))}
      </div>
      {failed && <p role="alert" className="mt-3 text-sm text-danger">{s.exportFailed}</p>}
    </Modal>
  );
}
