// Il testo semplice di un documento salvato (JSON dell'editor): serve per l'anteprima e per la ricerca.

interface JNode {
  type?: unknown;
  text?: unknown;
  content?: unknown;
}

const isObj = (v: unknown): v is JNode => typeof v === "object" && v !== null && !Array.isArray(v);
const LINE_BLOCKS = new Set(["paragraph", "heading", "codeBlock"]);

function inline(node: JNode): string {
  if (node.type === "text") return typeof node.text === "string" ? node.text : "";
  if (node.type === "hardBreak") return "\n";
  return Array.isArray(node.content) ? node.content.map((c) => (isObj(c) ? inline(c) : "")).join("") : "";
}

function lines(node: JNode, out: string[]) {
  if (LINE_BLOCKS.has(String(node.type))) {
    out.push(inline(node));
    return;
  }
  if (Array.isArray(node.content)) for (const c of node.content) if (isObj(c)) lines(c, out);
}

/** Le righe del documento, una per paragrafo, titolo o voce di elenco. Un contenuto rovinato dà testo vuoto, mai un errore. */
export function plainTextOf(content: unknown): string {
  if (!isObj(content)) return "";
  const out: string[] = [];
  lines(content, out);
  return out.join("\n").trim();
}

/** Le prime parole, su una riga sola, per l'elenco dei documenti. */
export function previewOf(text: string, max = 90): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? oneLine.slice(0, max).trimEnd() + "…" : oneLine;
}
