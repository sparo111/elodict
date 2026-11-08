import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { LICENSE_ID, SOURCE_CODE_URL } from "./legal";

const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

describe("licenza", () => {
  it("package.json dichiara la stessa licenza che c'è in legal.ts", () => {
    expect(JSON.parse(read("package.json")).license).toBe(LICENSE_ID);
    expect(LICENSE_ID).toBe("AGPL-3.0-only");
  });

  it("il file LICENSE è il testo completo della GNU AGPL versione 3", () => {
    const raw = read("LICENSE").replace(/\r\n/g, "\n");
    const text = raw.replace(/\s+/g, " "); // il testo ufficiale va a capo a metà frase: si confronta senza gli a capo
    expect(text).toMatch(/^ ?GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007/);
    // le parti che contano, compresa la 13 (rete) e la fine
    for (const part of [
      "0. Definitions.",
      "13. Remote Network Interaction; Use with the GNU General Public License.",
      "if you modify the Program, your modified version must prominently offer all users interacting with it remotely through a computer network",
      "15. Disclaimer of Warranty.",
      "END OF TERMS AND CONDITIONS",
      "How to Apply These Terms to Your New Programs",
    ]) {
      expect(text, part).toContain(part);
    }
    expect(raw.split("\n").length).toBeGreaterThan(640); // 661 righe nel testo ufficiale
  });

  it("l'indirizzo del codice sorgente è uno solo, sicuro, e punta al repository del progetto", () => {
    expect(SOURCE_CODE_URL).toBe("https://github.com/sparo111/elodict");
    expect(new URL(SOURCE_CODE_URL).protocol).toBe("https:");
  });

  it("l'indirizzo non è scritto altrove nel codice dell'app (solo in legal.ts)", () => {
    const scan = (dir: string): string[] =>
      fs.readdirSync(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true }).flatMap((e) => {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) return scan(rel);
        const isCode = /\.(ts|tsx)$/.test(e.name) && !/\.test\.ts$/.test(e.name) && rel !== "src/legal.ts";
        return isCode && read(rel).includes("github.com/sparo111") ? [rel] : [];
      });
    expect(scan("src")).toEqual([]);
  });
});
