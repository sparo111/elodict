import { describe, expect, it } from "vitest";
import { scoreText, tokenize } from "./metrics";

describe("confronto del testo", () => {
  it("testo uguale: nessun errore e tutta la punteggiatura giusta", () => {
    const s = scoreText("Buongiorno, vorrei un tavolo.", "Buongiorno, vorrei un tavolo.");
    expect(s).toMatchObject({ wer: 0, errors: 0, punctExpected: 2, punctCorrect: 2, punctExtra: 0 });
  });
  it("le maiuscole e la punteggiatura non contano per le parole", () => {
    expect(scoreText("Ciao a tutti.", "ciao a tutti").wer).toBe(0);
  });
  it("una parola sbagliata e una cancellata", () => {
    const s = scoreText("il treno parte alle nove", "il treno parti nove");
    expect(s.errors).toBe(2);
    expect(s.wer).toBeCloseTo(2 / 5);
  });
  it("punteggiatura mancante e in più", () => {
    const s = scoreText("Domani piove, porta l'ombrello.", "Domani piove porta l'ombrello");
    expect(s.punctExpected).toBe(2);
    expect(s.punctCorrect).toBe(0);
    const t = scoreText("Domani piove porta l'ombrello", "Domani, piove porta l'ombrello.");
    expect(t.punctExtra).toBe(2);
  });
  it("tokenize: la virgola decimale non è punteggiatura di fine parola e l'apostrofo resta", () => {
    expect(tokenize("costa 1,5 euro, l'ombrello.")).toEqual([
      { w: "costa", p: "" }, { w: "15", p: "" }, { w: "euro", p: "," }, { w: "l'ombrello", p: "." },
    ]);
  });
});
