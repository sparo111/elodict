import { useState } from "react";
import { Mail, Share2 } from "lucide-react";
import { Modal } from "../Modal";
import type { Strings } from "../../i18n";
import { buildFile, FORMATS, type ExportFormat } from "../../export/build";
import { canShareFiles, fitsInMailto, mailtoUrl } from "../../share/email";
import type { BuildProps } from "./ExportDialog";

const selectCls = "h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base";

export function SendDialog({ open, onClose, s, getDoc, title, isEmpty, docLang, plainText }: BuildProps & {
  open: boolean; onClose: () => void; s: Strings; plainText: () => string;
}) {
  const [subject, setSubject] = useState("");
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [shareFailed, setShareFailed] = useState(false);

  const effectiveSubject = subject || title;
  const body = open ? plainText() : "";
  const mailOk = !isEmpty && fitsInMailto(effectiveSubject, body);
  const canShare = open && canShareFiles();

  const openMail = () => {
    window.location.href = mailtoUrl(effectiveSubject, body);
  };

  const share = async () => {
    setShareFailed(false);
    try {
      const file = await buildFile(format, { doc: getDoc(), title, lang: docLang });
      await navigator.share({ files: [file], title: effectiveSubject });
      onClose();
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setShareFailed(true);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={s.sendTitle} closeLabel={s.close}>
      <p className="mb-4 text-sm text-muted">{s.sendIntro}</p>
      {isEmpty ? (
        <p role="status" className="text-sm">{s.emptyExport}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {s.sendSubject}
            <input
              className={selectCls}
              value={subject}
              placeholder={title}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={openMail}
              disabled={!mailOk}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail size={20} aria-hidden="true" />
              {s.sendOpenMail}
            </button>
            <p className="text-sm text-muted">{mailOk ? s.sendMailNote : s.sendTooLong}</p>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">{s.sendShareTitle}</h3>
            {canShare ? (
              <div className="flex gap-2">
                <select
                  aria-label={s.sendShareTitle}
                  className={selectCls}
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                >
                  {FORMATS.filter((f) => f !== "html").map((f) => <option key={f} value={f}>{s.fmt[f]}</option>)}
                </select>
                <button
                  type="button"
                  onClick={share}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border-input px-4 font-semibold hover:bg-surface"
                >
                  <Share2 size={18} aria-hidden="true" />
                  {s.sendShareButton}
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted">{s.sendNoShare}</p>
            )}
            {shareFailed && <p role="alert" className="text-sm text-danger">{s.shareFailed}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}
