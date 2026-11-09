import { describe, expect, it } from "vitest";
import { ATTRIBUTION } from "../../attribution";
import { fileUrl, PARAKEET_WEIGHTS, totalBytes } from "./models";

describe("pesi di Parakeet: revisioni fisse", () => {
  for (const w of Object.values(PARAKEET_WEIGHTS)) {
    it(`${w.id}: la revisione è un hash di commit (40 esadecimali), non «main»`, () => {
      expect(w.revision).toMatch(/^[0-9a-f]{40}$/);
      for (const f of w.files) {
        const u = fileUrl(w, f);
        expect(u).toContain(`/resolve/${w.revision}/`);
        expect(u).not.toContain("/main/");
      }
    });
  }
  it("le due versioni dei pesi sono quelle chieste: istupakov int8 e Olicorne redux w2a8", () => {
    expect(PARAKEET_WEIGHTS["istupakov-int8"].repo).toBe("istupakov/parakeet-tdt-0.6b-v3-onnx");
    expect(PARAKEET_WEIGHTS["istupakov-int8"].files.find((f) => f.name === "encoder")?.path).toBe("encoder-model.int8.onnx");
    expect(PARAKEET_WEIGHTS["olicorne-w2a8"].repo).toBe("Olicorne/parakeet-tdt-0.6b-v3-redux-onnx");
    expect(PARAKEET_WEIGHTS["olicorne-w2a8"].files.find((f) => f.name === "encoder")?.path).toBe("w2a8/encoder-model.w2a8.onnx");
  });
  it("il modello a 2 bit pesa molto meno di quello int8", () => {
    expect(totalBytes(PARAKEET_WEIGHTS["olicorne-w2a8"])).toBeLessThan(totalBytes(PARAKEET_WEIGHTS["istupakov-int8"]) / 3);
  });
});

describe("attribuzione CC-BY-4.0 pronta per Impostazioni (non ancora mostrata)", () => {
  for (const lang of ["it", "en", "fr", "es"] as const) {
    it(`${lang}: nomina NVIDIA, istupakov, Olicorne e moondream, la licenza e le modifiche`, () => {
      const a = ATTRIBUTION[lang];
      const all = [a.title, ...a.lines, a.license, a.changes].join(" ");
      for (const name of ["NVIDIA", "istupakov", "Olicorne", "moondream", "CC-BY-4.0"]) expect(all).toContain(name);
      expect(a.licenseUrl).toBe("https://creativecommons.org/licenses/by/4.0/");
      expect(a.changes.length).toBeGreaterThan(40);
    });
  }
});
