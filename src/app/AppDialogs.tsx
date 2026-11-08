import type { Editor } from "@tiptap/react";
import { ExportDialog } from "../components/dialogs/ExportDialog";
import { HelpDialog } from "../components/dialogs/HelpDialog";
import { SendDialog } from "../components/dialogs/SendDialog";
import { SettingsDialog } from "../components/dialogs/SettingsDialog";
import { InstallDialog } from "../install/Install";
import { Onboarding } from "../onboarding/Onboarding";
import { docToBlocks, toText } from "../export/blocks";
import type { Strings } from "../i18n";
import type { Prefs } from "./useSettings";
import type { DialogName } from "./Header";

interface Props {
  s: Strings;
  editor: Editor | null;
  prefs: Prefs;
  dialog: DialogName | null;
  onClose: () => void;
  title: string;
  isEmpty: boolean;
  settingsReady: boolean;
  onChange: (over: Partial<Prefs>) => void;
  onBackup: () => Promise<void>;
  onRestore: (file: File) => Promise<number | null>;
  onRedoSetup: () => void;
  onFinishOnboarding: (choice?: Pick<Prefs, "engine" | "whisperModel">) => void;
  onTryBox: () => void;
  onDone: (msg: string) => void;
}

/** Tutte le finestre dell'app: impostazioni, installazione, primo avvio, aiuto, esporta, invia. */
export function AppDialogs(p: Props) {
  const { s, prefs, editor } = p;
  const getDoc = () => editor?.getJSON() ?? { type: "doc", content: [] };
  const docLang = prefs.dictationLanguage;
  return (
    <>
      <SettingsDialog
        open={p.dialog === "settings"}
        onClose={p.onClose}
        s={s}
        value={prefs}
        onChange={p.onChange}
        onBackup={p.onBackup}
        onRestore={p.onRestore}
        onRedoSetup={p.onRedoSetup}
      />
      <InstallDialog s={s} lang={prefs.uiLanguage} />
      <Onboarding
        open={p.settingsReady && !prefs.onboardingDone}
        s={s}
        lang={prefs.uiLanguage}
        onLang={(l) => p.onChange({ uiLanguage: l, dictationLanguage: l })}
        onSkip={() => p.onFinishOnboarding()}
        onFinish={p.onFinishOnboarding}
        onTryBox={p.onTryBox}
      />
      <HelpDialog open={p.dialog === "help"} onClose={p.onClose} s={s} dictationLang={docLang} />
      <ExportDialog
        open={p.dialog === "export"}
        onClose={p.onClose}
        s={s}
        getDoc={getDoc}
        title={p.title}
        isEmpty={p.isEmpty}
        docLang={docLang}
        onDone={p.onDone}
      />
      <SendDialog
        open={p.dialog === "send"}
        onClose={p.onClose}
        s={s}
        getDoc={getDoc}
        title={p.title}
        isEmpty={p.isEmpty}
        docLang={docLang}
        plainText={() => toText(docToBlocks(getDoc()))}
      />
    </>
  );
}
