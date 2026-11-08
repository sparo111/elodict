import { describe, expect, it } from "vitest";
import { dictationToSegments } from "./parser";
import { itCommands } from "./it";

const run = (t: string, before = "") =>
  dictationToSegments(t, before, itCommands)
    .map((s) => (s.kind === "text" ? s.text : s.paragraph ? "¶" : "↵"))
    .join("");

describe("comandi in italiano", () => {
  it("scrive il testo semplice con la maiuscola iniziale", () => {
    expect(run("ciao a tutti")).toBe("Ciao a tutti");
  });
  it("virgola e punto si attaccano alla parola prima", () => {
    expect(run("ciao virgola come stai punto interrogativo")).toBe("Ciao, come stai?");
  });
  it("dopo il punto va la maiuscola", () => {
    expect(run("va bene punto domani vengo")).toBe("Va bene. Domani vengo");
  });
  it("punto e virgola vince su punto", () => {
    expect(run("uno punto e virgola due")).toBe("Uno; due");
  });
  it("a capo e nuovo paragrafo", () => {
    expect(run("riga uno a capo riga due nuovo paragrafo fine")).toBe("Riga uno↵Riga due¶Fine");
  });
  it("continua bene un testo già scritto", () => {
    expect(run("come stai", "Ciao")).toBe(" come stai");
    expect(run("ciao", "Fine.")).toBe(" Ciao");
    expect(run("ciao", "Prima riga\n")).toBe("Ciao");
  });
  it("non rompe con frase vuota", () => {
    expect(run("   ")).toBe("");
  });
});
