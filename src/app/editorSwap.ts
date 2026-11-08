import type { Editor } from "@tiptap/react";
import { history } from "@tiptap/pm/history";

/**
 * Mette nell'editor un altro documento. La cronologia di «annulla» riparte da zero:
 * altrimenti «annulla» riporterebbe il testo del documento di prima dentro quello nuovo.
 */
export function replaceDocument(editor: Editor, content: unknown): void {
  editor.commands.setContent((content ?? "") as never, false);
  editor.unregisterPlugin("history");
  editor.registerPlugin(history());
}
