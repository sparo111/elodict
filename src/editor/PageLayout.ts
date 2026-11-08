// Impaginazione a fogli A4: il testo scorre in una colonna sola, e a fine foglio si inserisce uno spazio
// (margine in basso + intervallo fra i fogli + margine in alto) così la riga successiva parte dal foglio dopo.
// Gli spazi sono solo decorazioni: non fanno parte del documento, quindi non finiscono nei file esportati.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Misure in pixel a 96 per pollice: un A4 è 210 × 297 mm = 794 × 1123 px. */
export const PAGE = {
  width: 794,
  height: 1123,
  gap: 24,          // intervallo fra due fogli
  marginTop: 96,    // 2,54 cm
  marginBottom: 96,
  marginX: 96,
} as const;
export const PAGE_PITCH = PAGE.height + PAGE.gap;
export const PAGE_CONTENT_HEIGHT = PAGE.height - PAGE.marginTop - PAGE.marginBottom;

export interface Line {
  top: number;     // in coordinate del documento, senza spazi di pagina
  bottom: number;
  pos: number;     // posizione nel documento dove inizia la riga
}
export interface Spacer {
  pos: number;
  height: number;
}

/**
 * Calcolo puro: dato l'elenco delle righe (nelle coordinate "naturali", cioè senza spazi),
 * dice dove inserire gli spazi e quanti fogli servono.
 */
export function planPages(lines: Line[]): { spacers: Spacer[]; pages: number } {
  const spacers: Spacer[] = [];
  const contentEnd = (page: number) => page * PAGE_PITCH + PAGE.marginTop + PAGE_CONTENT_HEIGHT;
  const contentStart = (page: number) => page * PAGE_PITCH + PAGE.marginTop;
  let offset = 0;
  let page = 0;
  for (const line of lines) {
    const h = line.bottom - line.top;
    // una riga più alta di tutta l'area utile non si può spostare: la si lascia stare
    if (h > PAGE_CONTENT_HEIGHT) continue;
    const top = line.top + offset;
    if (top + h > contentEnd(page) + 0.5) {
      // la riga non ci sta più: parte dal foglio dopo
      page++;
      const push = contentStart(page) - top;
      if (push > 0) {
        spacers.push({ pos: line.pos, height: push });
        offset += push;
      }
    }
  }
  return { spacers, pages: page + 1 };
}

export interface PageLayoutOptions {
  onPages: (pages: number) => void;
  getScale: () => number;
}

const key = new PluginKey<DecorationSet>("pageLayout");

type Box = { top: number; bottom: number; pos: number };

/**
 * Le righe di un blocco, nelle misure vere del foglio (senza lo zoom), con la posizione nel documento dove inizia ciascuna.
 * Si scorre parola per parola: così funziona anche per le righe fuori dallo schermo.
 */
function textLines(
  el: Element,
  lineHeight: number,
  scale: number,
  rootTop: number,
  posAt: (node: Node, offset: number) => number | null,
): Box[] {
  const lines: Box[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.nodeValue ?? "";
    const range = document.createRange();
    for (const m of text.matchAll(/\S+\s*/g)) {
      const start = m.index ?? 0;
      range.setStart(n, start);
      range.setEnd(n, Math.min(text.length, start + m[0].length));
      const r = range.getClientRects()[0];
      if (!r || (r.width === 0 && r.height === 0)) continue;
      // tutto in misure vere: lo schermo può essere rimpicciolito dallo zoom
      const rTop = (r.top - rootTop) / scale;
      const rBottom = (r.bottom - rootTop) / scale;
      const rHeight = rBottom - rTop;
      const half = Math.max(0, (lineHeight - rHeight) / 2); // il rettangolo del testo è più basso della riga
      const top = rTop - half;
      const bottom = rBottom + half;
      const last = lines[lines.length - 1];
      if (last && rTop < last.bottom - rHeight * 0.5) {
        last.top = Math.min(last.top, top);
        last.bottom = Math.max(last.bottom, bottom);
      } else {
        const pos = posAt(n, start);
        if (pos !== null) lines.push({ top, bottom, pos });
      }
    }
  }
  return lines;
}

export const PageLayout = Extension.create<PageLayoutOptions>({
  name: "pageLayout",

  addOptions() {
    return { onPages: () => undefined, getScale: () => 1 };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const meta = tr.getMeta(key) as DecorationSet | undefined;
            return meta ?? set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => key.getState(state),
        },
        view(view) {
          let raf = 0;
          let lastSignature = "";
          let lastPages = 0;

          const run = () => {
            const root = view.dom as HTMLElement;
            if (!root.isConnected) return;
            const scale = opts.getScale() || 1;

            // si misura con gli spazi nascosti: così le posizioni sono quelle "naturali"
            root.classList.add("pg-measure");
            const rootTop = root.getBoundingClientRect().top;
            const lines: Line[] = [];
            root.querySelectorAll("p, h1, h2, h3, h4, h5, h6").forEach((el) => {
              const cs = getComputedStyle(el);
              const lh = parseFloat(cs.lineHeight) || 24;
              const found = textLines(el, lh, scale, rootTop, (node, offset) => {
                try {
                  return view.posAtDOM(node, offset);
                } catch {
                  return null;
                }
              });
              if (found.length === 0) {
                // blocco vuoto: una riga sola, grande quanto il blocco
                const r = el.getBoundingClientRect();
                let pos: number | null = null;
                try {
                  pos = view.posAtDOM(el, 0);
                } catch {
                  pos = null;
                }
                if (pos !== null) lines.push({ top: (r.top - rootTop) / scale, bottom: (r.bottom - rootTop) / scale, pos });
                return;
              }
              for (const b of found) lines.push({ top: b.top, bottom: b.bottom, pos: b.pos });
            });
            root.classList.remove("pg-measure");

            lines.sort((a, b) => a.top - b.top);
            const { spacers, pages } = planPages(lines);

            const signature = spacers.map((s) => `${s.pos}:${Math.round(s.height)}`).join("|");
            if (signature !== lastSignature) {
              lastSignature = signature;
              const decos = spacers.map((s, i) => {
                const el = document.createElement("div");
                el.className = "page-spacer";
                el.setAttribute("aria-hidden", "true");
                el.contentEditable = "false";
                el.style.height = `${s.height}px`;
                return Decoration.widget(s.pos, el, { side: -1, key: `pg-${i}-${Math.round(s.height)}`, ignoreSelection: true });
              });
              const set = DecorationSet.create(view.state.doc, decos);
              view.dispatch(view.state.tr.setMeta(key, set).setMeta("addToHistory", false));
            }
            if (pages !== lastPages) {
              lastPages = pages;
              opts.onPages(pages);
            }
          };

          const schedule = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(run);
          };
          schedule();
          void document.fonts?.ready.then(schedule);

          return {
            update(v, prev) {
              if (prev.doc !== v.state.doc) schedule();
            },
            destroy() {
              cancelAnimationFrame(raf);
            },
          };
        },
      }),
    ];
  },
});
