// Misura delle righe di testo per l'impaginazione A4.
// Si misura un blocco (paragrafo, elenco...) una volta sola: finché il blocco non cambia, le sue righe,
// calcolate rispetto al suo bordo alto, restano valide anche se sopra è stato aggiunto o tolto testo.
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";

export interface Line {
  top: number;     // in coordinate del documento, senza spazi di pagina
  bottom: number;
  pos: number;     // posizione nel documento dove inizia la riga
}

const TEXT_BLOCKS = "p, h1, h2, h3, h4, h5, h6";

type PosAt = (node: Node, offset: number) => number | null;

/**
 * Le righe di un blocco di testo, nelle misure vere del foglio (senza lo zoom), con la posizione nel documento dove inizia ciascuna.
 * Si scorre parola per parola: così funziona anche per le righe fuori dallo schermo.
 */
function textLines(el: Element, lineHeight: number, scale: number, originTop: number, posAt: PosAt): Line[] {
  const lines: Line[] = [];
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
      const rTop = (r.top - originTop) / scale;
      const rBottom = (r.bottom - originTop) / scale;
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

/** Misura tutte le righe di un blocco di primo livello. Le coordinate sono rispetto al bordo alto del blocco e al suo inizio nel documento. */
function measureBlock(block: HTMLElement, blockStart: number, scale: number, posAt: PosAt): Line[] {
  const blockTop = block.getBoundingClientRect().top;
  const els = [...(block.matches(TEXT_BLOCKS) ? [block] : []), ...block.querySelectorAll(TEXT_BLOCKS)];
  const rel: Line[] = [];
  for (const el of els) {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const found = textLines(el, lh, scale, blockTop, posAt);
    if (found.length > 0) {
      rel.push(...found);
      continue;
    }
    // blocco vuoto: una riga sola, grande quanto il blocco
    const pos = posAt(el, 0);
    if (pos === null) continue;
    const r = el.getBoundingClientRect();
    rel.push({ top: (r.top - blockTop) / scale, bottom: (r.bottom - blockTop) / scale, pos });
  }
  return rel.map((l) => ({ top: l.top, bottom: l.bottom, pos: l.pos - blockStart }));
}

/** Ricorda le righe già misurate, per blocco. Si svuota se cambiano larghezza, zoom o caratteri. */
export class LineCache {
  private blocks = new WeakMap<PMNode, Line[]>();
  private key = "";
  /** quanti blocchi sono stati misurati davvero dall'ultimo `reset` (serve alle prove) */
  measured = 0;

  /** Svuota la memoria se la «chiave» (larghezza e zoom) è cambiata. */
  check(key: string) {
    if (key !== this.key) this.clear(key);
  }
  clear(key = this.key) {
    this.blocks = new WeakMap();
    this.key = key;
  }
  get(node: PMNode) {
    return this.blocks.get(node);
  }
  set(node: PMNode, lines: Line[]) {
    this.blocks.set(node, lines);
    this.measured++;
  }
}

/**
 * Tutte le righe del documento, nelle coordinate «naturali» (con gli spazi dei fogli nascosti).
 * Per ogni blocco: se non è cambiato dall'ultima volta si riusano le righe, altrimenti lo si misura.
 */
export function collectLines(view: EditorView, scale: number, cache: LineCache): Line[] {
  const root = view.dom as HTMLElement;
  cache.check(`${root.offsetWidth}@${scale}`);
  const rootTop = root.getBoundingClientRect().top;
  const posAt: PosAt = (node, offset) => {
    try {
      return view.posAtDOM(node, offset);
    } catch {
      return null; // il punto non è dentro il documento (per esempio uno spazio di foglio)
    }
  };
  const lines: Line[] = [];
  view.state.doc.forEach((node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    let rel = cache.get(node);
    if (!rel) {
      rel = measureBlock(dom, offset, scale, posAt);
      cache.set(node, rel);
    }
    const blockTop = (dom.getBoundingClientRect().top - rootTop) / scale;
    for (const l of rel) lines.push({ top: blockTop + l.top, bottom: blockTop + l.bottom, pos: offset + l.pos });
  });
  return lines.sort((a, b) => a.top - b.top);
}
