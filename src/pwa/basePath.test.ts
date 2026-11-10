import { describe, expect, it } from "vitest";
import { normalizeBase, ortBaseUrl } from "./basePath";

describe("normalizeBase", () => {
  it("rifiuta un percorso di Windows (Git Bash trasforma /elodict/ in C:/Program Files/Git/elodict/) invece di costruire un sito rotto", () => {
    expect(() => normalizeBase("C:/Program Files/Git/elodict/")).toThrowError(/MSYS_NO_PATHCONV/);
    expect(() => normalizeBase("D:\\cartella\\elodict")).toThrowError(/MSYS_NO_PATHCONV/);
    expect(normalizeBase("https://esempio.it/elodict")).toBe("https://esempio.it/elodict/"); // gli indirizzi veri restano validi
  });

  it("senza valore: la radice", () => {
    expect(normalizeBase(undefined)).toBe("/");
    expect(normalizeBase("")).toBe("/");
    expect(normalizeBase("   ")).toBe("/");
  });
  it("aggiunge le barre mancanti", () => {
    expect(normalizeBase("elodict")).toBe("/elodict/");
    expect(normalizeBase("/elodict")).toBe("/elodict/");
    expect(normalizeBase("elodict/")).toBe("/elodict/");
    expect(normalizeBase("/elodict/")).toBe("/elodict/");
  });
  it("più livelli e barre doppie", () => {
    expect(normalizeBase("a/b")).toBe("/a/b/");
    expect(normalizeBase("//a//b//")).toBe("/a/b/");
  });
  it("un indirizzo completo resta completo, con la barra finale", () => {
    expect(normalizeBase("https://esempio.it/x")).toBe("https://esempio.it/x/");
    expect(normalizeBase("https://esempio.it/x/")).toBe("https://esempio.it/x/");
  });
});

describe("ortBaseUrl: dove stanno i file del motore di Whisper", () => {
  it("nella radice", () => {
    expect(ortBaseUrl("/", "http://localhost:5173")).toBe("http://localhost:5173/ort/");
  });
  it("con un percorso base (GitHub Pages) l'indirizzo include il percorso", () => {
    expect(ortBaseUrl("/elodict/", "https://sparo111.github.io")).toBe("https://sparo111.github.io/elodict/ort/");
    expect(ortBaseUrl("elodict", "https://sparo111.github.io")).toBe("https://sparo111.github.io/elodict/ort/");
  });
  it("Parakeet ha la sua cartella (onnxruntime-web 1.31): ort31, separata da ort (1.22 di Whisper)", () => {
    expect(ortBaseUrl("/elodict/", "https://sparo111.github.io", "ort31")).toBe("https://sparo111.github.io/elodict/ort31/");
    expect(ortBaseUrl("/", "http://localhost:5173", "ort31")).toBe("http://localhost:5173/ort31/");
    expect(ortBaseUrl("/", "http://localhost:5173")).toBe("http://localhost:5173/ort/");
  });
  it("è sempre un indirizzo completo (con il sito davanti)", () => {
    expect(ortBaseUrl("/x/", "http://localhost:5199")).toMatch(/^https?:\/\//);
  });
  it("con una base che è già un indirizzo completo non aggiunge un secondo sito", () => {
    expect(ortBaseUrl("https://cdn.esempio.it/app", "http://localhost")).toBe("https://cdn.esempio.it/app/ort/");
  });
});
