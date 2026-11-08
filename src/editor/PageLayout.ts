// Impaginazione a fogli A4: il testo scorre in una colonna sola, e a fine foglio si inserisce uno spazio
// (margine in basso + intervallo fra i fogli + margine in alto) così la riga successiva parte dal foglio dopo.
// Gli spazi sono solo decorazioni: non fanno parte del documento, quindi non finiscono nei file esportati.
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { collectLines, LineCache, type Line } from "./measure";

export type { Line };

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
          const cache = new LineCache(); // righe già misurate, per blocco: si rimisura solo ciò che cambia

          const run = () => {
            const root = view.dom as HTMLElement;
            if (!root.isConnected) return;
            const t0 = performance.now();
            const scale = opts.getScale() || 1;

            // si misura con gli spazi nascosti: così le posizioni sono quelle "naturali"
            root.classList.add("pg-measure");
            const lines = collectLines(view, scale, cache);
            root.classList.remove("pg-measure");

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
            // misura del tempo speso a impaginare (la leggono le prove di velocità; costo trascurabile)
            performance.measure("pageLayout.run", { start: t0, end: performance.now() });
          };

          const schedule = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(run);
          };
          schedule();
          void document.fonts?.ready.then(() => {
            cache.clear(); // i caratteri sono cambiati: le righe misurate prima non valgono più
            schedule();
          });

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
