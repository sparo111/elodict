import { describe, expect, it } from "vitest";
import { cleanParakeetText } from "./clean";

describe("pulizia del testo di Parakeet", () => {
  it("una frase senza punteggiatura finale riceve il punto", () => {
    expect(cleanParakeetText("Buongiorno, vorrei prenotare un tavolo")).toBe("Buongiorno, vorrei prenotare un tavolo.");
  });
  it("se finisce già con punteggiatura non si tocca niente", () => {
    for (const t of ["Domani piove.", "Davvero?", "Che bello!", "Allora…", "Come dicevo,", "Elenco:", "Dice «sì»."]) expect(cleanParakeetText(t)).toBe(t);
  });
  it("i numeri in cifre restano in cifre, e finire con una cifra vuol dire che il punto si aggiunge", () => {
    expect(cleanParakeetText("Il treno parte alle 9.40 dal binario 7")).toBe("Il treno parte alle 9.40 dal binario 7.");
    expect(cleanParakeetText("Pago 1.250,50 euro")).toBe("Pago 1.250,50 euro.");
  });
  it("non cambia nessuna parola: solo spazi in eccesso", () => {
    expect(cleanParakeetText("  ciao   a\ttutti ")).toBe("ciao a tutti.");
    const words = (x: string) => x.replace(/[.,;:!?…]/g, "").split(/\s+/).filter(Boolean);
    const raw = "Gentile cliente, la informiamo che arriverà entro 3 giorni";
    expect(words(cleanParakeetText(raw))).toEqual(words(raw));
  });
  it("accenti e lettere di tutte e quattro le lingue sono lettere (il punto va dopo «è», «café», «mañana»)", () => {
    for (const t of ["Arriverà domani, perché è tardi", "Voilà le café", "Hasta mañana", "Wir sehen uns später"]) expect(cleanParakeetText(t)).toBe(`${t}.`);
  });
  it("silenzio o solo segni: niente da scrivere", () => {
    for (const t of ["", "   ", ".", "…", "- -", "?!"]) expect(cleanParakeetText(t)).toBe("");
  });
});
