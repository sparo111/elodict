import { Download, FolderOpen, HelpCircle, Mail, Settings } from "lucide-react";
import { Flags } from "../components/Flags";
import { InstallButton } from "../install/Install";
import type { Lang } from "../commands/types";
import type { Strings } from "../i18n";

export type DialogName = "settings" | "help" | "export" | "send" | "documents";

interface Props {
  s: Strings;
  uiLang: Lang;
  /** cambia la lingua dei menu e della voce insieme */
  onLang: (l: Lang) => void;
  onOpen: (d: DialogName) => void;
}

const iconBtn = "inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-semibold hover:bg-surface sm:px-3";

/** Intestazione: nome, bandierine e i quattro pulsanti (Installa, Invia, Esporta, Aiuto, Impostazioni). */
export function Header({ s, uiLang, onLang, onOpen }: Props) {
  const items = [
    { name: "documents", label: s.documents, Icon: FolderOpen },
    { name: "send", label: s.send, Icon: Mail },
    { name: "export", label: s.export, Icon: Download },
    { name: "help", label: s.help, Icon: HelpCircle },
    { name: "settings", label: s.settings, Icon: Settings },
  ] as const;
  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-lg">{s.appName}</h1>
        <Flags value={uiLang} label={s.flagsLabel} onPick={onLang} />
      </div>
      <nav className="flex items-center gap-1">
        <InstallButton s={s} />
        {items.map(({ name, label, Icon }) => (
          <button key={name} type="button" className={iconBtn} onClick={() => onOpen(name)} aria-label={label}>
            <Icon size={18} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
