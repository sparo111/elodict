import { describe, expect, it } from "vitest";
import { plainTextOf, previewOf } from "./plainText";
import { matches, normalize, queryWords, snippetOf } from "./search";
import { daysLeft, expiresAt, isExpired, TRASH_DAYS } from "./trash";
import { byModified, byRecency, copyTitle, recencyKey } from "./order";

const p = (...texts: string[]) => ({ type: "paragraph", content: texts.map((text) => ({ type: "text", text })) });

describe("testo semplice di un documento", () => {
  it("una riga per paragrafo, titolo e voce di elenco; gli a capo morbidi restano", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titolo" }] },
        p("Gentili ", "condomini"),
        { type: "bulletList", content: [{ type: "listItem", content: [p("uno")] }, { type: "listItem", content: [p("due")] }] },
        { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }] },
      ],
    };
    expect(plainTextOf(doc)).toBe("Titolo\nGentili condomini\nuno\ndue\na\nb");
  });

  it("un contenuto rovinato o vuoto dà testo vuoto, senza errori", () => {
    for (const bad of [null, undefined, 5, "x", [], { type: "doc" }, { type: "doc", content: [null, 3, { type: "paragraph" }] }]) {
      expect(plainTextOf(bad)).toBe("");
    }
    expect(plainTextOf({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: 7 }] }] })).toBe("");
    expect(plainTextOf({ type: "doc", content: [{ type: "paragraph", content: [null, { type: "image" }] }] })).toBe("");
  });

  it("l'anteprima è su una riga e si taglia", () => {
    expect(previewOf("uno\n\n due   tre")).toBe("uno due tre");
    expect(previewOf("a".repeat(200), 10)).toBe("a".repeat(10) + "…");
    expect(previewOf("corto", 10)).toBe("corto");
  });
});

describe("ricerca", () => {
  it("non bada a maiuscole e accenti", () => {
    expect(normalize("ÈCCO Perché")).toBe("ecco perche");
    expect(matches("Lettera", "Gentili condomini, è rinviata", "RINVIATA")).toBe(true);
    expect(matches("Lettera", "perché no", "perche")).toBe(true);
    expect(matches("Lettera", "perche no", "PERCHÉ")).toBe(true);
  });

  it("servono tutte le parole, in qualsiasi ordine, anche una nel titolo e una nel testo", () => {
    expect(matches("Verbale", "assemblea rinviata", "rinviata assemblea")).toBe(true);
    expect(matches("Verbale", "assemblea rinviata", "verbale rinviata")).toBe(true);
    expect(matches("Verbale", "assemblea rinviata", "assemblea ferie")).toBe(false);
  });

  it("una ricerca vuota li prende tutti; gli spazi in più non contano", () => {
    expect(queryWords("  uno   due ")).toEqual(["uno", "due"]);
    expect(matches("x", "y", "   ")).toBe(true);
  });

  it("il pezzetto di testo mostra dove sta la parola, con i caratteri veri (accenti compresi)", () => {
    const text = "Questa è una lunga lettera che parla di Perché e di molto altro ancora ancora ancora ancora";
    const s = snippetOf(text, "perche", 10)!;
    expect(s.match).toBe("Perché");
    expect(s.before.startsWith("…")).toBe(true);
    expect(s.after.endsWith("…")).toBe(true);
    expect(s.before + s.match + s.after).toContain("di Perché e");
  });

  it("prende la parola che compare per prima", () => {
    const s = snippetOf("alfa beta gamma", "gamma alfa", 3)!;
    expect(s.match).toBe("alfa");
  });

  it("senza parola nel testo (solo nel titolo) o senza ricerca: nessun pezzetto", () => {
    expect(snippetOf("niente di utile", "titolo", 10)).toBeNull();
    expect(snippetOf("qualcosa", "", 10)).toBeNull();
  });

  it("all'inizio e alla fine del testo non mette i puntini", () => {
    const s = snippetOf("ciao mondo", "mondo", 30)!;
    expect(s).toEqual({ before: "ciao ", match: "mondo", after: "" });
  });
});

describe("cestino", () => {
  const T0 = 1_700_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  it("scade dopo 30 giorni esatti", () => {
    expect(TRASH_DAYS).toBe(30);
    expect(expiresAt(T0)).toBe(T0 + 30 * DAY);
    expect(isExpired(T0, T0 + 30 * DAY - 1)).toBe(false);
    expect(isExpired(T0, T0 + 30 * DAY)).toBe(true);
  });
  it("giorni rimasti: arrotondati in su, mai sotto zero", () => {
    expect(daysLeft(T0, T0)).toBe(30);
    expect(daysLeft(T0, T0 + 29 * DAY + 1)).toBe(1);
    expect(daysLeft(T0, T0 + 31 * DAY)).toBe(0);
  });
});

describe("ordine e copie", () => {
  it("più recente = la più vicina tra modifica e apertura", () => {
    expect(recencyKey({ updatedAt: 10 })).toBe(10);
    expect(recencyKey({ updatedAt: 10, openedAt: 50 })).toBe(50);
    expect(recencyKey({ updatedAt: 90, openedAt: 50 })).toBe(90);
  });
  it("ordina senza toccare l'elenco originale", () => {
    const docs = [{ id: "a", updatedAt: 1 }, { id: "b", updatedAt: 3, openedAt: 2 }, { id: "c", updatedAt: 2, openedAt: 9 }];
    expect(byRecency(docs).map((d) => d.id)).toEqual(["c", "b", "a"]);
    expect(byModified(docs).map((d) => d.id)).toEqual(["b", "c", "a"]);
    expect(docs.map((d) => d.id)).toEqual(["a", "b", "c"]);
  });
  it("il titolo di una copia non si ripete", () => {
    expect(copyTitle("Lettera", "(copia)", [])).toBe("Lettera (copia)");
    expect(copyTitle("Lettera", "(copia)", ["Lettera (copia)"])).toBe("Lettera (copia) 2");
    expect(copyTitle("Lettera", "(copia)", ["Lettera (copia)", "Lettera (copia) 2"])).toBe("Lettera (copia) 3");
  });
});
