import { useEffect, useState } from "react";
import { FileText, Mail, Share2, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { MicTest } from "./MicTest";
import { COMMANDS, LANGS, LANG_NAME } from "../commands";
import { SYNTAX } from "../commands/syntax";
import { parseDictionary } from "../text/clean";
import type { SettingsRow } from "../store/db";
import type { CommandAction, Lang } from "../commands/types";
import type { Strings } from "../i18n";
import { buildFile, canPickLocation, downloadFile, FORMATS, saveDocumentFile, type ExportFormat } from "../export/build";
import { canShareFiles, fitsInMailto, mailtoUrl } from "../share/email";

const selectCls = "h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base";

/* ---------- Impostazioni ---------- */
interface SettingsProps {
  open: boolean;
  onClose: () => void;
  s: Strings;
  value: Omit<SettingsRow, "id">;
  onChange: (over: Partial<Omit<SettingsRow, "id">>) => void;
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<number | null>;
}

export function SettingsDialog({ open, onClose, s, value, onChange, onBackup, onRestore }: SettingsProps) {
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const restoreFile = async (file: File | undefined) => {
    if (!file) return;
    setBackupMsg(null);
    const n = await onRestore(file);
    setBackupMsg(n === null ? { ok: false, text: s.backupError } : { ok: true, text: s.backupOk.replace("{n}", String(n)) });
  };
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [importError, setImportError] = useState(false);

  const addEntry = () => {
    const f = from.trim();
    const t = to.trim();
    if (!f || !t) return;
    const rest = value.dictionary.filter((e) => e.from.toLowerCase() !== f.toLowerCase());
    onChange({ dictionary: [...rest, { from: f, to: t }] });
    setFrom("");
    setTo("");
  };

  const exportDict = () => {
    const file = new File([JSON.stringify(value.dictionary, null, 2)], "dizionario.json", { type: "application/json" });
    downloadFile(file);
  };

  const importDict = async (file: File | undefined) => {
    if (!file) return;
    setImportError(false);
    try {
      const entries = parseDictionary(await file.text());
      const keep = value.dictionary.filter((e) => !entries.some((n) => n.from.toLowerCase() === e.from.toLowerCase()));
      onChange({ dictionary: [...keep, ...entries].slice(0, 500) });
    } catch {
      setImportError(true);
    }
  };

  const check = "h-5 w-5 shrink-0 accent-[var(--color-accent)]";

  return (
    <Modal open={open} onClose={onClose} title={s.settingsTitle} closeLabel={s.close}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {s.dictationLang}
          <select className={selectCls} value={value.dictationLanguage} onChange={(e) => onChange({ dictationLanguage: e.target.value as Lang })}>
            {LANGS.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {s.uiLang}
          <select className={selectCls} value={value.uiLanguage} onChange={(e) => onChange({ uiLanguage: e.target.value as Lang })}>
            {LANGS.map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
          </select>
        </label>

        <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
          <legend className="mb-1 text-sm font-semibold">{s.cleanTitle}</legend>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className={check} checked={value.cleanFillers} onChange={(e) => onChange({ cleanFillers: e.target.checked })} />
            {s.cleanFillers}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className={check} checked={value.cleanRepeats} onChange={(e) => onChange({ cleanRepeats: e.target.checked })} />
            {s.cleanRepeats}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className={check} checked={value.autoPeriod} onChange={(e) => onChange({ autoPeriod: e.target.checked })} />
            {s.autoPeriod}
          </label>
          <p className="text-xs text-muted">{s.autoPeriodNote}</p>
        </fieldset>

        <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="dict-title">
          <h3 id="dict-title" className="text-sm font-semibold">{s.dictTitle}</h3>
          <p className="text-sm text-muted">{s.dictHelp}</p>
          <div className="flex flex-wrap gap-2">
            <input aria-label={s.dictFrom} placeholder={s.dictFrom} className={`${selectCls} min-w-0 flex-1`} value={from} onChange={(e) => setFrom(e.target.value)} />
            <input aria-label={s.dictTo} placeholder={s.dictTo} className={`${selectCls} min-w-0 flex-1`} value={to} onChange={(e) => setTo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addEntry(); }} />
            <button type="button" onClick={addEntry} className="h-10 shrink-0 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
              {s.dictAdd}
            </button>
          </div>
          {value.dictionary.length === 0 ? (
            <p className="text-sm text-muted">{s.dictEmpty}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {value.dictionary.map((e) => (
                <li key={e.from} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 break-words"><span className="text-muted">{e.from}</span> → <strong>{e.to}</strong></span>
                  <button type="button" aria-label={`${s.dictRemove}: ${e.from}`}
                    onClick={() => onChange({ dictionary: value.dictionary.filter((x) => x.from !== e.from) })}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-surface">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportDict} disabled={value.dictionary.length === 0}
              className="h-9 rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface disabled:opacity-40">
              {s.dictExport}
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-accent">
              {s.dictImport}
              <input type="file" accept="application/json,.json" className="sr-only"
                onChange={(e) => { void importDict(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
          {importError && <p role="alert" className="text-sm text-danger">{s.dictImportError}</p>}
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="mic-title">
          <h3 id="mic-title" className="text-sm font-semibold">{s.micTitle}</h3>
          <MicTest s={s} />
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="backup-title">
          <h3 id="backup-title" className="text-sm font-semibold">{s.backupTitle}</h3>
          <p className="text-sm text-muted">{s.backupHelp}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void onBackup()} className="h-9 rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface">
              {s.backupExport}
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface focus-within:outline focus-within:outline-2 focus-within:outline-accent">
              {s.backupImport}
              <input type="file" accept="application/json,.json" className="sr-only"
                onChange={(e) => { void restoreFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
          {backupMsg && (
            <p role={backupMsg.ok ? "status" : "alert"} className={`text-sm ${backupMsg.ok ? "" : "text-danger"}`}>{backupMsg.text}</p>
          )}
        </section>

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
    case "symbol":
      return a.char;
    case "format":
      return `${s.fmtMark[a.mark]} · ${s.fmtTarget[a.target]}`;
    case "control":
      return a.op === "pause" ? s.dPause : a.op === "resume" ? s.dResume : a.op === "switchLang" ? `${s.dSwitchTo} ${LANG_NAME[a.lang]}` : a.op === "showHelp" ? s.dShowHelp : s.dStopDict;
    case "list":
      return a.kind === "bullet" ? s.dListBullet : a.kind === "ordered" ? s.dListOrdered : s.dListExit;
    case "select":
      return a.target === "all" ? s.dSelectAll : a.target === "word" ? s.dSelectWord : a.target === "sentence" ? s.dSelectSentence : s.dDeselect;
    case "break":
      return a.paragraph ? s.dNewParagraph : s.dNewLine;
    case "edit":
      return a.op === "undo" ? s.dUndo : a.op === "deleteWord" ? s.dDeleteWord : a.op === "deleteSentence" ? s.dDeleteSentence : s.dDeleteRange;
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
      <h3 className="mb-1 mt-5 text-sm font-semibold">{s.shortcutsTitle}</h3>
      <p className="mb-4 text-sm">{s.shortcuts}</p>
      <h3 className="mb-1 mt-5 text-sm font-semibold">{s.helpExamples}</h3>
      <ul className="list-disc pl-5 text-sm">
        {SYNTAX[dictationLang].examples.map((e) => <li key={e}>«{e}»</li>)}
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
