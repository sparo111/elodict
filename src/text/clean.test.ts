import { describe, expect, it } from "vitest";
import { applyDictionary, dedupeRepeats, parseDictionary, stripFillers } from "./clean";
import { COMMANDS } from "../commands";
import { compose, parseTranscript, tokenize } from "../commands/parser";

describe("parole riempitive", () => {
  it("toglie i suoni in tutte le lingue, anche con la virgola attaccata", () => {
    expect(stripFillers("ehm ciao uhm, come stai", "it")).toBe("ciao come stai");
    expect(stripFillers("um hello er world", "en")).toBe("hello world");
    expect(stripFillers("euh bonjour hum", "fr")).toBe("bonjour");
    expect(stripFillers("eh hola em mundo", "es")).toBe("hola mundo");
  });
  it("non tocca parole vere", () => {
    expect(stripFillers("eh certo che sì", "es")).toBe("certo che sì");
    expect(stripFillers("era un erede", "en")).toBe("era un erede");
  });
});

describe("ripetizioni", () => {
  it("toglie le parole ripetute di fila", () => {
    expect(dedupeRepeats("che che bello")).toBe("che bello");
    expect(dedupeRepeats("The the cat")).toBe("The cat");
  });
  it("lascia stare numeri e parole cortissime", () => {
    expect(dedupeRepeats("no no no")).toBe("no no no");
    expect(dedupeRepeats("10 10 persone")).toBe("10 10 persone");
  });
});

describe("dizionario personale", () => {
  const dict = [
    { from: "pippo rossi", to: "Pippo Rossi" },
    { from: "whisper", to: "Whisper" },
  ];
  const run = (t: string) =>
    compose(applyDictionary(tokenize(t, COMMANDS.it), dict), "")
      .map((s) => (s.kind === "text" ? s.text : "↵"))
      .join("");
  it("sostituisce parole e gruppi di parole", () => {
    expect(run("ha scritto pippo rossi")).toBe("Ha scritto Pippo Rossi");
    expect(run("uso whisper")).toBe("Uso Whisper");
  });
  it("ignora maiuscole e non tocca i comandi", () => {
    expect(run("PIPPO ROSSI virgola ciao")).toBe("Pippo Rossi, ciao");
  });
  it("un dizionario vuoto non cambia nulla", () => {
    const t = tokenize("ciao", COMMANDS.it);
    expect(applyDictionary(t, [])).toEqual(t);
  });
  it("parseTranscript lo applica", () => {
    const steps = parseTranscript("pippo rossi", COMMANDS.it, undefined, dict);
    expect(JSON.stringify(steps)).toContain("Pippo Rossi");
  });
});

describe("import del dizionario", () => {
  it("accetta un file valido", () => {
    expect(parseDictionary('[{"from":"a b","to":"AB"}]')).toEqual([{ from: "a b", to: "AB" }]);
  });
  it("rifiuta formati sbagliati", () => {
    expect(() => parseDictionary("{}")).toThrow();
    expect(() => parseDictionary('[{"from":1,"to":"x"}]')).toThrow();
    expect(() => parseDictionary("non json")).toThrow();
  });
  it("salta voci vuote o troppo lunghe", () => {
    expect(parseDictionary(`[{"from":"","to":"x"},{"from":"${"a".repeat(81)}","to":"x"}]`)).toEqual([]);
  });
});
