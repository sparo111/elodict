import { describe, expect, it } from "vitest";
import { charsToDelete, deriveTitle } from "./edit";

describe("cancella parola", () => {
  it("toglie l'ultima parola e lo spazio prima, così la prossima parola si attacca bene", () => {
    const s = "Ciao a tutti";
    expect(s.slice(0, s.length - charsToDelete(s, "deleteWord"))).toBe("Ciao a");
  });
  it("toglie anche la punteggiatura attaccata", () => {
    const s = "Come stai?";
    expect(s.slice(0, s.length - charsToDelete(s, "deleteWord"))).toBe("Come");
  });
  it("niente da cancellare", () => {
    expect(charsToDelete("", "deleteWord")).toBe(0);
  });
});

describe("cancella frase", () => {
  it("toglie l'ultima frase finita", () => {
    const s = "Va bene. Domani vengo.";
    expect(s.slice(0, s.length - charsToDelete(s, "deleteSentence"))).toBe("Va bene.");
  });
  it("toglie la frase ancora aperta", () => {
    const s = "Va bene. Domani ven";
    expect(s.slice(0, s.length - charsToDelete(s, "deleteSentence"))).toBe("Va bene.");
  });
  it("se è una sola frase toglie tutto", () => {
    const s = "Solo una frase";
    expect(charsToDelete(s, "deleteSentence")).toBe(s.length);
  });
});

describe("titolo", () => {
  it("prende la prima riga, corta, senza punto finale", () => {
    expect(deriveTitle("Riunione di lunedì.\nAltro", "documento")).toBe("Riunione di lunedì");
  });
  it("usa il nome di riserva se è vuoto", () => {
    expect(deriveTitle("  \n ", "documento")).toBe("documento");
  });
  it("accorcia i titoli lunghi", () => {
    expect(deriveTitle("a".repeat(80), "x").length).toBe(41);
  });
});
