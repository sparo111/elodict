import { useEffect, useRef, useState } from "react";
import type { Lang } from "../../commands/types";
import type { Strings } from "../../i18n";
import { daysLeft } from "../trash";
import type { DocItem } from "./useLibrary";
import type { DocumentRow } from "../../store/db";

const btn = "inline-flex min-h-9 items-center rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface";
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");
const formatDate = (ts: number, lang: Lang) => new Date(ts).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });

interface LiveProps {
  item: DocItem;
  s: Strings;
  lang: Lang;
  current: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onTrash: () => void;
}

/** Una riga dell'elenco: apri, rinomina, duplica, metti nel cestino (con conferma). */
export function LiveItem({ item, s, lang, current, onOpen, onRename, onDuplicate, onTrash }: LiveProps) {
  const { row, preview, snippet } = item;
  const [mode, setMode] = useState<"view" | "rename" | "trash">("view");
  const [name, setName] = useState(row.title);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mode === "trash") cancelRef.current?.focus();
  }, [mode]);

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-2">
          <button
            type="button"
            onClick={onOpen}
            aria-label={fill(s.docsOpenNamed, { title: row.title })}
            aria-current={current ? "true" : undefined}
            className="rounded-md px-1 text-left text-base font-bold underline-offset-2 hover:bg-surface hover:underline"
          >
            {row.title}
          </button>
          {current && <span className="rounded-pill bg-accent-soft px-2 text-xs font-semibold text-accent">{s.docsCurrent}</span>}
        </span>
        <span className="px-1 text-xs text-muted">{fill(s.docsModified, { date: formatDate(row.updatedAt, lang) })}</span>
        {snippet ? (
          <span className="px-1 text-sm">
            {snippet.before}
            <mark className="rounded bg-accent-soft px-0.5 text-text">{snippet.match}</mark>
            {snippet.after}
          </span>
        ) : (
          preview && <span className="px-1 text-sm text-muted">{preview}</span>
        )}
      </div>

      {mode === "view" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => { setName(row.title); setMode("rename"); }} aria-label={fill(s.docsRenameNamed, { title: row.title })}>
            {s.docsRename}
          </button>
          <button type="button" className={btn} onClick={onDuplicate} aria-label={fill(s.docsDuplicateNamed, { title: row.title })}>
            {s.docsDuplicate}
          </button>
          <button type="button" className={btn} onClick={() => setMode("trash")} aria-label={fill(s.docsDeleteNamed, { title: row.title })}>
            {s.docsDelete}
          </button>
        </div>
      )}

      {mode === "rename" && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            onRename(name);
            setMode("view");
          }}
        >
          <label htmlFor={`rename-${row.id}`} className="text-sm font-semibold">{s.docsRenameLabel}</label>
          <input
            id={`rename-${row.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
            className="h-10 w-full rounded-md border border-border-input bg-bg px-3"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={!name.trim()} className={`${btn} bg-accent text-on-accent disabled:opacity-50`}>{s.docsSave}</button>
            <button type="button" className={btn} onClick={() => setMode("view")}>{s.docsCancel}</button>
          </div>
        </form>
      )}

      {mode === "trash" && (
        <div role="group" aria-label={s.docsTrashAction} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm">{fill(s.docsTrashConfirm, { title: row.title })}</p>
          <div className="flex gap-2">
            <button type="button" className={`${btn} bg-accent text-on-accent`} onClick={() => { onTrash(); setMode("view"); }}>
              {s.docsTrashAction}
            </button>
            <button type="button" ref={cancelRef} className={btn} onClick={() => setMode("view")}>{s.docsCancel}</button>
          </div>
        </div>
      )}
    </li>
  );
}

interface TrashProps {
  row: DocumentRow;
  s: Strings;
  now: number;
  onRestore: () => void;
  onDelete: () => void;
}

/** Una riga del cestino: ripristina, o elimina per sempre (con conferma). */
export function TrashItem({ row, s, now, onRestore, onDelete }: TrashProps) {
  const [confirm, setConfirm] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) cancelRef.current?.focus();
  }, [confirm]);
  const left = daysLeft(row.deletedAt ?? now, now);
  return (
    <li className="flex flex-col gap-2 py-3">
      <span className="flex flex-wrap items-baseline gap-2">
        <strong className="text-base">{row.title}</strong>
        <span className="text-xs text-muted">{left === 1 ? s.docsDayLeft : fill(s.docsDaysLeft, { n: String(left) })}</span>
      </span>
      {!confirm ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={onRestore} aria-label={fill(s.docsRestoreNamed, { title: row.title })}>{s.docsRestore}</button>
          <button type="button" className={btn} onClick={() => setConfirm(true)} aria-label={fill(s.docsForeverNamed, { title: row.title })}>{s.docsForever}</button>
        </div>
      ) : (
        <div role="group" aria-label={s.docsForever} className="flex flex-col gap-2 rounded-md border border-danger p-3">
          <p className="text-sm">{fill(s.docsForeverConfirm, { title: row.title })}</p>
          <div className="flex gap-2">
            <button type="button" className={`${btn} border-danger text-danger`} onClick={onDelete}>{s.docsForever}</button>
            <button type="button" ref={cancelRef} className={btn} onClick={() => setConfirm(false)}>{s.docsCancel}</button>
          </div>
        </div>
      )}
    </li>
  );
}
