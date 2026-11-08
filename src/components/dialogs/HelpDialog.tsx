import { Modal } from "../Modal";
import { COMMANDS, LANG_NAME } from "../../commands";
import { SYNTAX } from "../../commands/syntax";
import type { CommandAction, Lang } from "../../commands/types";
import type { Strings } from "../../i18n";

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
