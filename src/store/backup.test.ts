import { describe, expect, it } from "vitest";
import { BackupLimitError, buildBackup, MAX_BACKUP_BYTES, parseBackup, stringifyBackup } from "./backup";
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

  it("scrive la copia solo se rispetta i limiti: tanti documenti (200 sì, 201 no)", () => {
    const docs = (n: number) => Array.from({ length: n }, (_, i) => ({ ...doc, id: `d${i}` }));
    expect(parseBackup(stringifyBackup(buildBackup(settings, docs(200)))).documents).toHaveLength(200);
    expect(() => stringifyBackup(buildBackup(settings, docs(201)))).toThrowError(BackupLimitError);
    try {
      stringifyBackup(buildBackup(settings, docs(201)));
    } catch (e) {
      expect((e as BackupLimitError).reason).toBe("too-many");
    }
  });

  it("scrive la copia solo se rispetta i limiti: peso", () => {
    const big = { ...doc, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(MAX_BACKUP_BYTES) }] }] } };
    try {
      stringifyBackup(buildBackup(settings, [big]));
      throw new Error("doveva fallire");
    } catch (e) {
      expect(e).toBeInstanceOf(BackupLimitError);
      expect((e as BackupLimitError).reason).toBe("too-big");
    }
  });

  it("quello che si scrive si rilegge (limite compreso): nessuna copia scritta e poi rifiutata", () => {
    const docs = Array.from({ length: 200 }, (_, i) => ({ ...doc, id: `d${i}` }));
    expect(() => parseBackup(stringifyBackup(buildBackup(settings, docs)))).not.toThrow();
  });

  it("un nome scelto dall'utente passa nella copia; le copie vecchie senza il campo si leggono come prima", () => {
    const renamed = { ...doc, title: "Il mio nome", titleCustom: true };
    expect(parseBackup(stringifyBackup(buildBackup(settings, [renamed]))).documents[0]).toMatchObject({ title: "Il mio nome", titleCustom: true });
    expect(parseBackup(stringifyBackup(buildBackup(settings, [doc]))).documents[0]).not.toHaveProperty("titleCustom");
  });

  it("i campi interni (cestino, ultima apertura) non entrano nella copia letta", () => {
    const withInternals = { ...doc, openedAt: 5, deletedAt: 7 };
    const back = parseBackup(stringifyBackup(buildBackup(settings, [withInternals]))).documents[0];
    expect(back).not.toHaveProperty("openedAt");
    expect(back).not.toHaveProperty("deletedAt");
  });
});
