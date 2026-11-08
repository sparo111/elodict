import type { Editor } from "@tiptap/react";
import { downloadFile } from "../export/build";
import { exportBackup, restoreBackup } from "../store/db";
import { BackupLimitError, parseBackup } from "../store/backup";

/** Copia di sicurezza: scarica tutto in un file / ripristina da un file. */
export function useBackupActions(opts: {
  editor: Editor | null;
  flush: (editor: Editor | null) => Promise<boolean>;
  reload: () => Promise<void>;
  onDone: () => void;
  /** la copia non ci sta nei limiti (troppi documenti o troppo grande) */
  onTooBig: (reason: "too-many" | "too-big") => void;
}) {
  const backup = async () => {
    await opts.flush(opts.editor); // salva subito l'ultima modifica
    let json: string;
    try {
      json = await exportBackup();
    } catch (e) {
      if (e instanceof BackupLimitError) return opts.onTooBig(e.reason);
      throw e;
    }
    const day = new Date().toISOString().slice(0, 10);
    downloadFile(new File([json], `elodict-copia-${day}.json`, { type: "application/json" }));
    opts.onDone();
  };
  const restore = async (file: File): Promise<number | null> => {
    try {
      const n = await restoreBackup(parseBackup(await file.text()));
      await opts.reload();
      return n;
    } catch {
      return null;
    }
  };
  return { backup, restore };
}
