import { describe, expect, it } from "vitest";
import { charsToDelete, deriveTitle, rangeFromTo, rangeOfLast } from "./edit";

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

describe("cancella più parole o frasi", () => {
  it("3 parole", () => {
    const s = "Uno due tre quattro cinque";
    expect(s.slice(0, s.length - charsToDelete(s, "deleteWord", 3))).toBe("Uno due");
  });
  it("più parole di quelle presenti: cancella tutto senza errori", () => {
    expect(charsToDelete("Solo due", "deleteWord", 10)).toBe("Solo due".length);
  });
  it("2 frasi", () => {
    const s = "Prima. Seconda. Terza.";
    expect(s.slice(0, s.length - charsToDelete(s, "deleteSentence", 2))).toBe("Prima.");
  });
});

describe("intervalli", () => {
  it("ultima parola e ultima frase senza spazi ai bordi", () => {
    const s = "Va bene. Domani vengo.  ";
    const w = rangeOfLast(s, "word")!;
    expect(s.slice(w.start, w.end)).toBe("vengo.");
    const f = rangeOfLast(s, "sentence")!;
    expect(s.slice(f.start, f.end)).toBe("Domani vengo.");
  });
  it("da X a Y toglie anche lo spazio prima", () => {
    const s = "Ciao bel mondo felice";
    const r = rangeFromTo(s, "bel", "mondo")!;
    expect(s.slice(0, r.start) + s.slice(r.end)).toBe("Ciao felice");
  });
  it("usa l'ultimo X che ha un Y dopo", () => {
    const s = "a b a c b";
    const r = rangeFromTo(s, "a", "b")!;
    expect(s.slice(0, r.start) + s.slice(r.end)).toBe("a b");
  });
  it("niente da trovare", () => {
    expect(rangeFromTo("Ciao", "x", "y")).toBeNull();
    expect(rangeOfLast("   ", "word")).toBeNull();
  });
});

describe("casi limite", () => {
  it("solo spazi: niente parola da cancellare; una frase fatta di soli spazi si cancella tutta", () => {
    expect(charsToDelete("   ", "deleteWord")).toBe(0);
    expect(charsToDelete("   ", "deleteSentence")).toBe(3);
    expect(charsToDelete("", "deleteWord")).toBe(0);
  });
  it("da X a Y: se manca X o Y non fa niente", () => {
    expect(rangeFromTo("Ciao mondo", "", "mondo")).toBeNull();
    expect(rangeFromTo("Ciao mondo", "ciao", "")).toBeNull();
  });
  it("da X a Y: ignora gli X senza Y dopo e prova quelli prima; senza spazio davanti non lo toglie", () => {
    // l'ultimo «a» non ha nessun «z» dopo di sé: si passa a quello prima, che sta all'inizio (nessuno spazio davanti)
    const s = "a b z a c";
    const r = rangeFromTo(s, "a", "z")!;
    expect(r).toEqual({ start: 0, end: 5 });
    expect(rangeFromTo("a b", "a", "z")).toBeNull();
  });
  it("il titolo si ferma alla prima riga non vuota e toglie la punteggiatura finale", () => {
    expect(deriveTitle("\n\n  Ciao a tutti...\nsecondo", "x")).toBe("Ciao a tutti");
  });
});
