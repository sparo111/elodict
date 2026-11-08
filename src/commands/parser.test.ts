import { describe, expect, it } from "vitest";
import { compose, dictationToSegments, parseTranscript, NBSP } from "./parser";
import { COMMANDS } from "./index";
import { SYNTAX } from "./syntax";
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
    expect(steps.map((s) => s.kind)).toEqual(["run", "act", "run"]);
    expect(steps[1]).toEqual({ kind: "act", action: { type: "edit", op: "deleteWord" } });
  });
  it("annulla è un comando in tutte le lingue", () => {
    for (const [lang, word] of [["it", "annulla"], ["en", "undo"], ["fr", "annule"], ["es", "deshacer"]] as const) {
      expect(parseTranscript(word, COMMANDS[lang])).toEqual([{ kind: "act", action: { type: "edit", op: "undo" } }]);
    }
  });
  it("compose senza token dà lista vuota", () => {
    expect(compose([], "")).toEqual([]);
  });
});

const act = (lang: Lang, t: string) => {
  const steps = parseTranscript(t, COMMANDS[lang], SYNTAX[lang]);
  return steps.length === 1 && steps[0].kind === "act" ? steps[0].action : steps;
};

describe("cancella con numeri e parole", () => {
  it("cancella N parole o frasi, con cifre o a parole", () => {
    expect(act("it", "cancella 3 parole")).toEqual({ type: "edit", op: "deleteWord", n: 3 });
    expect(act("it", "cancella due frasi")).toEqual({ type: "edit", op: "deleteSentence", n: 2 });
    expect(act("it", "cancella le ultime 4 parole")).toEqual({ type: "edit", op: "deleteWord", n: 4 });
    expect(act("en", "delete 3 words")).toEqual({ type: "edit", op: "deleteWord", n: 3 });
    expect(act("fr", "efface deux phrases")).toEqual({ type: "edit", op: "deleteSentence", n: 2 });
    expect(act("es", "borra tres palabras")).toEqual({ type: "edit", op: "deleteWord", n: 3 });
  });
  it("cancella da X a Y", () => {
    expect(act("it", "cancella da ciao a mondo")).toEqual({ type: "edit", op: "deleteRange", from: "ciao", to: "mondo" });
    expect(act("en", "delete from good morning to world")).toEqual({ type: "edit", op: "deleteRange", from: "good morning", to: "world" });
    expect(act("fr", "efface de bonjour à monde")).toEqual({ type: "edit", op: "deleteRange", from: "bonjour", to: "monde" });
    expect(act("es", "borra de hola a mundo")).toEqual({ type: "edit", op: "deleteRange", from: "hola", to: "mundo" });
  });
  it("senza numero o senza 'a' resta una parola normale", () => {
    expect(run("it", "cancella la nota")).toBe("Cancella la nota");
    expect(act("it", "cancella da ciao")).not.toHaveProperty("op");
  });
});

describe("formattazione a voce", () => {
  it("riconosce grassetto/corsivo/sottolineato su questo, parola, frase", () => {
    expect(act("it", "grassetto ultima parola")).toEqual({ type: "format", mark: "bold", target: "word" });
    expect(act("it", "corsivo questo")).toEqual({ type: "format", mark: "italic", target: "that" });
    expect(act("en", "underline last sentence")).toEqual({ type: "format", mark: "underline", target: "sentence" });
    expect(act("en", "clear formatting that")).toEqual({ type: "format", mark: "clear", target: "that" });
    expect(act("fr", "gras dernier mot")).toEqual({ type: "format", mark: "bold", target: "word" });
    expect(act("es", "negrita última palabra")).toEqual({ type: "format", mark: "bold", target: "word" });
  });
  it("la parola da sola resta testo", () => {
    expect(run("it", "il grassetto è bello")).toBe("Il grassetto è bello");
  });
});

describe("simboli", () => {
  it("valuta e simboli staccati come parole", () => {
    expect(run("it", "costa 5 simbolo di euro")).toBe("Costa 5 €");
    expect(run("en", "mail me at sign home")).toBe("Mail me @ home");
    expect(run("es", "son 10 símbolo del euro")).toBe("Son 10 €");
  });
  it("percentuale e gradi si attaccano al numero", () => {
    expect(run("it", "20 segno di percentuale")).toBe("20%");
    expect(run("en", "20 degree symbol")).toBe("20°");
    expect(run("fr", "20 signe pourcentage")).toBe(`20${NBSP}%`);
  });
  it("il simbolo non cambia le maiuscole", () => {
    expect(run("en", "buy now dollar sign ten")).toBe("Buy now $ ten");
  });
});
