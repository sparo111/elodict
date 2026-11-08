import { useState } from "react";
import { FileText, Mail, Share2 } from "lucide-react";
import { Modal } from "./Modal";
import { COMMANDS, LANGS, LANG_NAME } from "../commands";
import type { CommandAction, Lang } from "../commands/types";
import type { Strings } from "../i18n";
import { buildFile, downloadFile, FORMATS, type ExportFormat } from "../export/build";
import { canShareFiles, fitsInMailto, mailtoUrl } from "../share/email";

const selectCls = "h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base";

/* ---------- Impostazioni ---------- */
interface SettingsProps {
  open: boolean;
  onClose: () => void;
  s: Strings;
  dictationLang: Lang;
  uiLang: Lang;
  onDictationLang: (l: Lang) => void;
  onUiLang: (l: Lang) => void;
}

export function SettingsDialog({ open, onClose, s, dictationLang, uiLang, onDictationLang, onUiLang }: SettingsProps) {
  return (
    <Modal open={open} onClose={onClose} title={s.settingsTitle} closeLabel={s.close}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {s.dictationLang}
          <select className={selectCls} value={dictationLang} onChange={(e) => onDictationLang(e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {s.uiLang}
          <select className={selectCls} value={uiLang} onChange={(e) => onUiLang(e.target.value as Lang)}>
            {LANGS.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </select>
        </label>
        <p className="text-sm text-muted">{s.settingsNote}</p>
      </div>
    </Modal>
  );
}

/* ---------- Aiuto: elenco comandi ---------- */
function describe(a: CommandAction, s: Strings): string {
  switch (a.type) {
    case "punct":
    case "open":
    case "close":
      return a.char;
    case "break":
      return a.paragraph ? s.dNewParagraph : s.dNewLine;
    case "edit":
      return a.op === "undo" ? s.dUndo : a.op === "deleteWord" ? s.dDeleteWord : s.dDeleteSentence;
  }
}

export function HelpDialog({ open, onClose, s, dictationLang }: { open: boolean; onClose: () => void; s: Strings; dictationLang: Lang }) {
  return (
    <Modal open={open} onClose={onClose} title={`${s.helpTitle} · ${LANG_NAME[dictationLang]}`} closeLabel={s.close}>
      <p className="mb-3 text-sm text-muted">{s.helpIntro}</p>
      <ul className="divide-y divide-border">
        {COMMANDS[dictationLang].map((c, i) => (
          <li key={i} className="flex items-baseline justify-between gap-4 py-2">
            <span className="font-semibold">{c.phrases.map((p) => `«${p}»`).join(" / ")}</span>
            <span className="shrink-0 text-right font-mono text-sm text-muted">{describe(c.action, s)}</span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* ---------- Esporta ---------- */
interface BuildProps {
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

  const run = async (f: ExportFormat) => {
    if (isEmpty) return onDone(s.emptyExport);
    setBusy(f);
    setFailed(false);
    try {
      downloadFile(await buildFile(f, { doc: getDoc(), title, lang: docLang }));
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

/* ---------- Invia per email ---------- */
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
