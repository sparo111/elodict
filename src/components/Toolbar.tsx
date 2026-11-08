import type { ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Bold, Heading2, Italic, List, ListOrdered, Mic, Redo2, Square, Underline, Undo2 } from "lucide-react";
import type { Strings } from "../i18n";
import { LANGS, LANG_NAME } from "../commands";
import type { Lang } from "../commands/types";
import type { Zoom } from "./Paper";

interface Props {
  editor: Editor;
  s: Strings;
  listening: boolean;
  micDisabled: boolean;
  onMic: () => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  zoom: Zoom;
  onZoom: (z: Zoom) => void;
}

const base =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-text hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40";

function Tool({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // Non togliere il cursore dal testo quando si clicca un'icona.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${base} ${active ? "bg-accent-soft text-accent" : ""}`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />;

export function Toolbar({ editor, s, listening, micDisabled, onMic, lang, onLang, zoom, onZoom }: Props) {
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      heading: e.isActive("heading", { level: 2 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const run = () => editor.chain().focus();

  return (
    <section aria-label={s.tbToolbar} className="sticky top-0 z-10 border-b border-border bg-bg">
      <div role="toolbar" aria-label={s.tbToolbar} className="mx-auto flex max-w-editor items-center gap-1 overflow-x-auto px-4 py-1">
        <button
          type="button"
          title={listening ? s.stop : s.talk}
          aria-label={listening ? s.stop : s.talk}
          aria-pressed={listening}
          disabled={micDisabled}
          onClick={onMic}
          className={`${base} ${listening ? "bg-recording text-on-accent hover:bg-recording" : "bg-accent text-on-accent hover:bg-accent"}`}
        >
          {listening ? <Square size={18} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
        </button>
        <select
          aria-label={s.dictationLang}
          title={s.dictationLang}
          value={lang}
          onChange={(e) => onLang(e.target.value as Lang)}
          className="h-10 shrink-0 rounded-md border border-border-input bg-bg px-2 text-sm font-semibold"
        >
          {LANGS.map((l) => (
            <option key={l} value={l}>{LANG_NAME[l]}</option>
          ))}
        </select>
        <Divider />
        <Tool label={s.tbUndo} disabled={!st.canUndo} onClick={() => run().undo().run()}>
          <Undo2 size={18} aria-hidden="true" />
        </Tool>
        <Tool label={s.tbRedo} disabled={!st.canRedo} onClick={() => run().redo().run()}>
          <Redo2 size={18} aria-hidden="true" />
        </Tool>
        <Divider />
        <Tool label={s.tbBold} active={st.bold} onClick={() => run().toggleBold().run()}>
          <Bold size={18} aria-hidden="true" />
        </Tool>
        <Tool label={s.tbItalic} active={st.italic} onClick={() => run().toggleItalic().run()}>
          <Italic size={18} aria-hidden="true" />
        </Tool>
        <Tool label={s.tbUnderline} active={st.underline} onClick={() => run().toggleUnderline().run()}>
          <Underline size={18} aria-hidden="true" />
        </Tool>
        <Divider />
        <Tool label={s.tbHeading} active={st.heading} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={18} aria-hidden="true" />
        </Tool>
        <Tool label={s.tbBullet} active={st.bullet} onClick={() => run().toggleBulletList().run()}>
          <List size={18} aria-hidden="true" />
        </Tool>
        <Tool label={s.tbOrdered} active={st.ordered} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered size={18} aria-hidden="true" />
        </Tool>
        <Divider />
        <select
          aria-label={s.zoomLabel}
          title={s.zoomLabel}
          value={String(zoom)}
          onChange={(e) => onZoom(e.target.value === "fit" ? "fit" : Number(e.target.value))}
          className="h-10 shrink-0 rounded-md border border-border-input bg-bg px-2 text-sm font-semibold"
        >
          <option value="fit">{s.zoomFit}</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
        </select>
      </div>
    </section>
  );
}
