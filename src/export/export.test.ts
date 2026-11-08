import { describe, expect, it } from "vitest";
import { docToBlocks, toHtml, toMarkdown, toText } from "./blocks";
import { buildFile, safeName } from "./build";

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titolo" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Ciao " },
        { type: "text", text: "mondo", marks: [{ type: "bold" }] },
        { type: "hardBreak" },
        { type: "text", text: "riga <due>", marks: [{ type: "italic" }] },
      ],
    },
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "uno" }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "due" }] }] },
      ],
    },
    { type: "paragraph" },
  ],
};

describe("blocchi", () => {
  it("ignora il paragrafo vuoto finale", () => {
    expect(docToBlocks(doc).map((b) => b.kind)).toEqual(["h", "p", "li", "li"]);
  });
  it("testo semplice", () => {
    expect(toText(docToBlocks(doc))).toBe("Titolo\n\nCiao mondo\nriga <due>\n\n- uno\n- due\n");
  });
  it("markdown con grassetto, corsivo e elenco", () => {
    const md = toMarkdown(docToBlocks(doc));
    expect(md).toContain("# Titolo");
    expect(md).toContain("**mondo**");
    expect(md).toContain("*riga <due>*");
    expect(md).toContain("- uno\n- due");
  });
  it("html con caratteri speciali protetti", () => {
    const html = toHtml(docToBlocks(doc), "T & C", "it");
    expect(html).toContain("riga &lt;due&gt;");
    expect(html).toContain("<title>T &amp; C</title>");
    expect(html).toContain("<ul>");
  });
});

describe("file", () => {
  it("nome file sicuro", () => {
    expect(safeName('a/b:c?"d')).toBe("abcd");
    expect(safeName("  ")).toBe("documento");
  });
  it("crea tutti i formati non vuoti", async () => {
    for (const f of ["docx", "pdf", "md", "txt", "html"] as const) {
      const file = await buildFile(f, { doc, title: "Prova", lang: "it" });
      expect(file.name).toBe(`Prova.${f}`);
      expect(file.size).toBeGreaterThan(10);
    }
  });
  it("il PDF inizia con l'intestazione giusta", async () => {
    const file = await buildFile("pdf", { doc, title: "x", lang: "it" });
    const head = new TextDecoder().decode(new Uint8Array(await file.arrayBuffer()).slice(0, 5));
    expect(head).toBe("%PDF-");
  });
  it("il docx è un archivio zip", async () => {
    const file = await buildFile("docx", { doc, title: "x", lang: "it" });
    const head = new Uint8Array(await file.arrayBuffer()).slice(0, 2);
    expect(Array.from(head)).toEqual([0x50, 0x4b]);
  });
});
