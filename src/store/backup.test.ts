import { describe, expect, it } from "vitest";
import { buildBackup, parseBackup } from "./backup";
import type { DocumentRow, SettingsRow } from "./db";

const doc: DocumentRow = {
  id: "a1",
  title: "Prova",
  content: { type: "doc", content: [{ type: "paragraph" }] },
  language: "it",
  createdAt: 1,
  updatedAt: 2,
};
const settings: SettingsRow = {
  id: "main",
  dictationLanguage: "fr",
  uiLanguage: "it",
  cleanFillers: true,
  cleanRepeats: false,
  autoPeriod: false,
  engine: "browser",
  whisperModel: "base",
  dictionary: [{ from: "a", to: "B" }],
  onboardingDone: true,
  microphoneId: "mic-b",
};

describe("copia di sicurezza", () => {
  it("scrive e rilegge tutto senza perdere niente", () => {
    const json = JSON.stringify(buildBackup(settings, [doc]));
    const back = parseBackup(json);
    expect(back.documents).toEqual([doc]);
    expect(back.settings).toEqual({
      dictationLanguage: "fr",
      uiLanguage: "it",
      cleanFillers: true,
      cleanRepeats: false,
      autoPeriod: false,
      engine: "browser",
      whisperModel: "base",
      dictionary: [{ from: "a", to: "B" }],
      onboardingDone: true,
      microphoneId: "mic-b",
    });
  });
  it("funziona anche senza impostazioni", () => {
    expect(parseBackup(JSON.stringify(buildBackup(undefined, [doc]))).settings).toBeNull();
  });
  it("rifiuta file che non sono copie di Elodict", () => {
    for (const bad of ["non json", "{}", "[]", '{"app":"altro","version":1,"documents":[]}', '{"app":"elodict","version":2,"documents":[]}']) {
      expect(() => parseBackup(bad)).toThrow();
    }
  });
  it("rifiuta documenti rovinati e non importa niente a metà", () => {
    const broken = { ...buildBackup(settings, [doc]), documents: [doc, { ...doc, id: 5 }] };
    expect(() => parseBackup(JSON.stringify(broken))).toThrow();
    const badLang = { ...buildBackup(settings, [{ ...doc, language: "xx" as never }]) };
    expect(() => parseBackup(JSON.stringify(badLang))).toThrow();
  });
  it("rifiuta impostazioni rovinate", () => {
    const b = buildBackup(settings, [doc]) as unknown as { settings: Record<string, unknown> };
    b.settings.cleanFillers = "sì";
    expect(() => parseBackup(JSON.stringify(b))).toThrow();
  });
  it("limita il numero di documenti", () => {
    const many = Array.from({ length: 201 }, (_, i) => ({ ...doc, id: `d${i}` }));
    expect(() => parseBackup(JSON.stringify(buildBackup(settings, many)))).toThrow();
  });
  it("le copie vecchie senza il punto automatico si importano lo stesso", () => {
    const b = buildBackup(settings, [doc]) as unknown as { settings: Record<string, unknown> };
    delete b.settings.autoPeriod;
    expect(parseBackup(JSON.stringify(b)).settings?.autoPeriod).toBe(false);
  });
  it("le copie vecchie senza i campi del riconoscimento offline si importano con i valori di partenza", () => {
    const b = buildBackup(settings, [doc]) as unknown as { settings: Record<string, unknown> };
    delete b.settings.engine;
    delete b.settings.whisperModel;
    const back = parseBackup(JSON.stringify(b)).settings;
    expect(back?.engine).toBe("browser");
    expect(back?.whisperModel).toBe("base");
  });
  it("ricorda la scelta offline", () => {
    const b = buildBackup({ ...settings, engine: "offline", whisperModel: "tiny" }, [doc]);
    const back = parseBackup(JSON.stringify(b)).settings;
    expect(back?.engine).toBe("offline");
    expect(back?.whisperModel).toBe("tiny");
  });
});
