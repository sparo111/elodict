import { docToBlocks, plain, toHtml, toMarkdown, toText, type Block } from "./blocks";

export type ExportFormat = "docx" | "pdf" | "md" | "txt" | "html";
export const FORMATS: ExportFormat[] = ["docx", "pdf", "md", "txt", "html"];

const MIME: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  md: "text/markdown;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  html: "text/html;charset=utf-8",
};

export function safeName(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "").trim();
  return cleaned || "documento";
}

async function buildDocx(blocks: Block[]): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const H = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  const runsOf = (b: Block) =>
    b.runs.flatMap((r) =>
      r.text.split("\n").map((part, i) => new TextRun({ text: part, bold: r.bold, italics: r.italic, break: i > 0 ? 1 : undefined })),
    );
  const children = blocks.map((b) => {
    if (b.kind === "h") return new Paragraph({ heading: H[Math.min(5, (b.level ?? 1) - 1)], children: runsOf(b) });
    if (b.kind === "li" && !b.ordered) return new Paragraph({ bullet: { level: 0 }, children: runsOf(b) });
    if (b.kind === "li") return new Paragraph({ children: [new TextRun(`${b.n}. `), ...runsOf(b)] });
    return new Paragraph({ children: runsOf(b), spacing: { after: 160 } });
  });
  return Packer.toBlob(new Document({ sections: [{ children }] }));
}

async function buildPdf(blocks: Block[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 20, width = 170, bottom = 277;
  let y = 25;
  // Il font di base del PDF non ha tutti i simboli: li sostituiamo con equivalenti semplici.
  const clean = (s: string) => s.replace(/ /g, " ").replace(/…/g, "...").replace(/[“”]/g, '"');
  for (const b of blocks) {
    const size = b.kind === "h" ? 18 - Math.min(4, (b.level ?? 1) * 1.5) : 12;
    const line = size * 0.5;
    doc.setFont("helvetica", b.kind === "h" ? "bold" : "normal");
    doc.setFontSize(size);
    const text = clean((b.kind === "li" ? (b.ordered ? `${b.n}. ` : "• ") : "") + plain(b));
    for (const l of doc.splitTextToSize(text, width) as string[]) {
      if (y > bottom) {
        doc.addPage();
        y = 25;
      }
      doc.text(l, left, y);
      y += line;
    }
    y += b.kind === "li" ? 1 : 4;
  }
  return doc.output("blob");
}

export interface BuildInput {
  doc: unknown;      // JSON dell'editor
  title: string;
  lang: string;      // lingua del documento (per l'HTML)
}

export async function buildFile(format: ExportFormat, input: BuildInput): Promise<File> {
  const blocks = docToBlocks(input.doc);
  let blob: Blob;
  switch (format) {
    case "docx": blob = await buildDocx(blocks); break;
    case "pdf": blob = await buildPdf(blocks); break;
    case "md": blob = new Blob([toMarkdown(blocks)], { type: MIME.md }); break;
    case "html": blob = new Blob([toHtml(blocks, input.title, input.lang)], { type: MIME.html }); break;
    default: blob = new Blob([toText(blocks)], { type: MIME.txt });
  }
  return new File([blob], `${safeName(input.title)}.${format}`, { type: MIME[format].split(";")[0] });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
