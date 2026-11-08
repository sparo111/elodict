import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { PAGE, PAGE_PITCH } from "../editor/PageLayout";

export type Zoom = "fit" | number;

interface Props {
  editor: Editor | null;
  pages: number;
  zoom: Zoom;
  scaleRef: MutableRefObject<number>;
  isEmpty: boolean;
  placeholder: string;
}

/** La scrivania con i fogli A4: uno sotto l'altro, con il numero di pagina e il testo che scorre da uno all'altro. */
export function Paper({ editor, pages, zoom, scaleRef, isEmpty, placeholder }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // "Adatta" riduce il foglio se lo schermo è stretto (telefono); non lo ingrandisce mai oltre la misura vera.
  const fit = avail ? Math.min(1, (avail - 24) / PAGE.width) : 1;
  const scale = zoom === "fit" ? fit : zoom;
  scaleRef.current = scale;
  const totalHeight = pages * PAGE_PITCH - PAGE.gap;

  return (
    <div ref={scroller} className="paper-scroller" data-testid="paper-scroller">
      <div className="paper-frame" style={{ width: PAGE.width * scale, height: totalHeight * scale }}>
        <div className="paper-scale" style={{ transform: `scale(${scale})` }} data-scale={scale}>
          <div className="paper-stack" style={{ minHeight: totalHeight }}>
            <div className="paper-sheets" aria-hidden="true">
              {Array.from({ length: pages }, (_, i) => (
                <div key={i} className="paper-sheet" data-page={i + 1} style={{ top: i * PAGE_PITCH }}>
                  <span className="paper-number">{i + 1} / {pages}</span>
                </div>
              ))}
            </div>
            {isEmpty && <p className="paper-placeholder">{placeholder}</p>}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
