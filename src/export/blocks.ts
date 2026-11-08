// Trasforma il documento dell'editor (JSON TipTap) in blocchi semplici,
// da cui si ricavano tutti i formati: txt, md, html, docx, pdf.

export interface Run { text: string; bold?: boolean; italic?: boolean }
export interface Block {
  kind: "p" | "h" | "li";
  level?: number;      // titoli 1..6
  ordered?: boolean;   // elenchi
  n?: number;          // numero nell'elenco numerato
  runs: Run[];
}

interface JNode {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  content?: JNode[];
  attrs?: Record<string, unknown>;
}

function inline(nodes: JNode[] = []): Run[] {
  const runs: Run[] = [];
  for (const n of nodes) {
    if (n.type === "text" && n.text) {
      const marks = n.marks?.map((m) => m.type) ?? [];
      runs.push({ text: n.text, bold: marks.includes("bold") || undefined, italic: marks.includes("italic") || undefined });
    } else if (n.type === "hardBreak") {
      runs.push({ text: "\n" });
    } else if (n.content) {
      runs.push(...inline(n.content));
    }
  }
  return runs;
}

function walk(node: JNode, out: Block[], list?: { ordered: boolean; n: number }) {
  switch (node.type) {
    case "paragraph":
      out.push(list
        ? { kind: "li", ordered: list.ordered, n: list.n, runs: inline(node.content) }
        : { kind: "p", runs: inline(node.content) });
      break;
    case "heading":
      out.push({ kind: "h", level: Number(node.attrs?.level ?? 1), runs: inline(node.content) });
      break;
    case "bulletList":
    case "orderedList": {
      const ordered = node.type === "orderedList";
      (node.content ?? []).forEach((item, i) => {
        for (const child of item.content ?? []) walk(child, out, { ordered, n: i + 1 });
      });
      break;
    }
    default:
      for (const child of node.content ?? []) walk(child, out, list);
  }
}

export function docToBlocks(doc: unknown): Block[] {
  const out: Block[] = [];
  walk(doc as JNode, out);
  while (out.length && out[out.length - 1].kind === "p" && plain(out[out.length - 1]) === "") out.pop();
  return out;
}

export const plain = (b: Block) => b.runs.map((r) => r.text).join("");
const prefix = (b: Block) => (b.kind === "li" ? (b.ordered ? `${b.n}. ` : "- ") : "");
const sep = (prev: Block | undefined, cur: Block) => (prev?.kind === "li" && cur.kind === "li" ? "\n" : "\n\n");

export function toText(blocks: Block[]): string {
  return blocks.map((b, i) => (i ? sep(blocks[i - 1], b) : "") + prefix(b) + plain(b)).join("") + (blocks.length ? "\n" : "");
}

function mdRun(r: Run): string {
  let t = r.text.replace(/\n/g, "  \n");
  if (!t.trim()) return t;
  const lead = /^\s*/.exec(t)![0];
  const trail = /\s*$/.exec(t)![0];
  const core = t.trim();
  if (r.bold && r.italic) t = `***${core}***`;
  else if (r.bold) t = `**${core}**`;
  else if (r.italic) t = `*${core}*`;
  else return t;
  return lead + t + trail;
}

export function toMarkdown(blocks: Block[]): string {
  return (
    blocks
      .map((b, i) => {
        const head = b.kind === "h" ? "#".repeat(Math.min(6, b.level ?? 1)) + " " : prefix(b);
        return (i ? sep(blocks[i - 1], b) : "") + head + b.runs.map(mdRun).join("");
      })
      .join("") + (blocks.length ? "\n" : "")
  );
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function htmlRun(r: Run): string {
  let t = esc(r.text).replace(/\n/g, "<br>");
  if (r.italic) t = `<em>${t}</em>`;
  if (r.bold) t = `<strong>${t}</strong>`;
  return t;
}

export function toHtml(blocks: Block[], title: string, lang: string): string {
  const body: string[] = [];
  let openList: "ul" | "ol" | null = null;
  const closeList = () => {
    if (openList) body.push(`</${openList}>`);
    openList = null;
  };
  for (const b of blocks) {
    const inner = b.runs.map(htmlRun).join("");
    if (b.kind === "li") {
      const tag = b.ordered ? "ol" : "ul";
      if (openList !== tag) {
        closeList();
        body.push(`<${tag}>`);
        openList = tag;
      }
      body.push(`<li>${inner}</li>`);
    } else {
      closeList();
      const tag = b.kind === "h" ? `h${Math.min(6, b.level ?? 1)}` : "p";
      body.push(`<${tag}>${inner}</${tag}>`);
    }
  }
  closeList();
  return `<!doctype html>\n<html lang="${esc(lang)}">\n<head>\n<meta charset="utf-8">\n<title>${esc(title)}</title>\n</head>\n<body>\n${body.join("\n")}\n</body>\n</html>\n`;
}
