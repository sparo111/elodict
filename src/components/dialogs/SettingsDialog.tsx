import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../Modal";
import { SOURCE_CODE_URL } from "../../legal";
import { MicTest } from "../MicTest";
import { OfflineSection } from "../OfflineSection";
import { LANGS, LANG_NAME } from "../../commands";
import { parseDictionary } from "../../text/clean";
import type { SettingsRow } from "../../store/db";
import type { Lang } from "../../commands/types";
import type { Strings } from "../../i18n";
import { downloadFile } from "../../export/build";

const selectCls = "h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  s: Strings;
  value: Omit<SettingsRow, "id">;
  onChange: (over: Partial<Omit<SettingsRow, "id">>) => void;
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<number | null>;
  onRedoSetup: () => void;
}

export function SettingsDialog({ open, onClose, s, value, onChange, onBackup, onRestore, onRedoSetup }: SettingsProps) {
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

        <OfflineSection s={s} engine={value.engine} model={value.whisperModel} onEngine={(engine) => onChange({ engine })} onModel={(whisperModel) => onChange({ whisperModel })} uiLang={value.uiLanguage} />

        <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="mic-title">
          <h3 id="mic-title" className="text-sm font-semibold">{s.micTitle}</h3>
          <MicTest s={s} micId={value.microphoneId} onMicId={(microphoneId) => onChange({ microphoneId })} engine={value.engine} />
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

        <button
          type="button"
          onClick={onRedoSetup}
          className="h-10 self-start rounded-md border border-border-input px-4 text-sm font-semibold hover:bg-surface"
        >
          {s.redoSetup}
        </button>

        <p className="text-sm text-muted">{s.settingsNote}</p>
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <p className="font-document text-sm italic text-muted">{s.dedication}</p>
          <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-accent underline">
            {s.sourceCode}
          </a>
        </div>
      </div>
    </Modal>
  );
}
