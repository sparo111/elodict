import { describe, expect, it } from "vitest";
import { compose, dictationToSegments, parseTranscript, NBSP } from "./parser";
import { COMMANDS } from "./index";
import type { Lang } from "./types";

const run = (lang: Lang, t: string, before = "") =>
  dictationToSegments(t, before, COMMANDS[lang])
    .map((s) => (s.kind === "text" ? s.text : s.paragraph ? "¶" : "↵"))
    .join("");

describe("italiano", () => {
  it("scrive il testo semplice con la maiuscola iniziale", () => {
    expect(run("it", "ciao a tutti")).toBe("Ciao a tutti");
  });
  it("virgola e punto si attaccano alla parola prima", () => {
    expect(run("it", "ciao virgola come stai punto interrogativo")).toBe("Ciao, come stai?");
  });
  it("dopo il punto va la maiuscola", () => {
    expect(run("it", "va bene punto domani vengo")).toBe("Va bene. Domani vengo");
  });
  it("punto e virgola vince su punto", () => {
    expect(run("it", "uno punto e virgola due")).toBe("Uno; due");
  });
  it("a capo e nuovo paragrafo", () => {
    expect(run("it", "riga uno a capo riga due nuovo paragrafo fine")).toBe("Riga uno↵Riga due¶Fine");
  });
  it("parentesi e virgolette", () => {
    expect(run("it", "vedi apri parentesi nota chiudi parentesi punto")).toBe("Vedi (nota).");
    expect(run("it", "disse virgolette aperte ciao virgolette chiuse")).toBe("Disse «ciao»");
  });
  it("continua bene un testo già scritto", () => {
    expect(run("it", "come stai", "Ciao")).toBe(" come stai");
    expect(run("it", "ciao", "Fine.")).toBe(" Ciao");
    expect(run("it", "ciao", "Prima riga\n")).toBe("Ciao");
  });
  it("frase vuota non rompe", () => {
    expect(run("it", "   ")).toBe("");
  });
});

describe("English", () => {
  it("punctuation and capitals", () => {
    expect(run("en", "hello comma how are you question mark")).toBe("Hello, how are you?");
    expect(run("en", "fine period thanks")).toBe("Fine. Thanks");
  });
  it("new line and paragraph", () => {
    expect(run("en", "one new line two new paragraph three")).toBe("One↵Two¶Three");
  });
  it("parentheses", () => {
    expect(run("en", "see open parenthesis note close parenthesis period")).toBe("See (note).");
  });
  it("is case-insensitive for what the browser returns", () => {
    expect(run("en", "Hello Comma World")).toBe("Hello, World");
  });
});

describe("français", () => {
  it("espace insécable avant ? ! : ;", () => {
    expect(run("fr", "bonjour virgule ça va point d'interrogation")).toBe(`Bonjour, ça va${NBSP}?`);
    expect(run("fr", "attention deux points ici")).toBe(`Attention${NBSP}: ici`);
  });
  it("accepte l'apostrophe typographique", () => {
    expect(run("fr", "ça va point d’exclamation")).toBe(`Ça va${NBSP}!`);
  });
  it("guillemets et saut de ligne", () => {
    expect(run("fr", "il dit guillemet ouvrant salut guillemet fermant")).toBe("Il dit «salut»");
    expect(run("fr", "un saut de ligne deux")).toBe("Un↵Deux");
  });
});

describe("español", () => {
  it("signos de apertura ¿ ¡", () => {
    expect(run("es", "signo de apertura de interrogación cómo estás signo de interrogación")).toBe("¿Cómo estás?");
    expect(run("es", "hola punto signo de apertura de exclamación qué bien signo de exclamación")).toBe("Hola. ¡Qué bien!");
  });
  it("coma y punto y coma", () => {
    expect(run("es", "uno coma dos punto y coma tres")).toBe("Uno, dos; tres");
  });
  it("nueva línea", () => {
    expect(run("es", "uno nueva línea dos nuevo párrafo tres")).toBe("Uno↵Dos¶Tres");
  });
});

describe("comandi di modifica", () => {
  it("separano il testo prima e dopo", () => {
    const steps = parseTranscript("ciao cancella parola mondo", COMMANDS.it);
    expect(steps.map((s) => s.kind)).toEqual(["run", "edit", "run"]);
    expect(steps[1]).toEqual({ kind: "edit", op: "deleteWord" });
  });
  it("annulla è un comando in tutte le lingue", () => {
    for (const [lang, word] of [["it", "annulla"], ["en", "undo"], ["fr", "annule"], ["es", "deshacer"]] as const) {
      expect(parseTranscript(word, COMMANDS[lang])).toEqual([{ kind: "edit", op: "undo" }]);
    }
  });
  it("compose senza token dà lista vuota", () => {
    expect(compose([], "")).toEqual([]);
  });
});
