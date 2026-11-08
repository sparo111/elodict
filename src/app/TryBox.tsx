import { useState } from "react";
import type { Strings } from "../i18n";

/** Apre la casella «Prova senza microfono» e ci mette il cursore (usato dal primo avvio). */
export function openTryBox() {
  const box = document.querySelector("details");
  if (box) box.open = true;
  document.getElementById("try")?.focus();
}

/** Casella per provare tutto scrivendo al posto di parlare: la frase passa dalle stesse regole della voce. */
export function TryBox({ s, onSubmit }: { s: Strings; onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <details className="mb-3 rounded-md border border-border p-3">
      <summary className="cursor-pointer text-sm font-semibold">{s.tryTitle}</summary>
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onSubmit(text);
          setText("");
        }}
      >
        <label htmlFor="try" className="text-sm text-muted">{s.tryHelp}</label>
        <div className="flex gap-2">
          <input
            id="try"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={s.tryPlaceholder}
            className="h-10 min-w-0 flex-1 rounded-md border border-border-input bg-bg px-3"
          />
          <button type="submit" className="h-10 shrink-0 rounded-md border border-border-input px-4 text-sm font-semibold hover:bg-surface">
            {s.tryButton}
          </button>
        </div>
      </form>
    </details>
  );
}
