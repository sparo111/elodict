import { afterEach, describe, expect, it, vi } from "vitest";
import { isMissing, listMics, openMic, type MicDevice } from "./devices";

const dev = (kind: string, deviceId: string, label: string) => ({ kind, deviceId, label }) as MediaDeviceInfo;
const stream = (name: string) => ({ name }) as unknown as MediaStream;
const err = (name: string) => Object.assign(new Error(name), { name });

describe("elenco dei microfoni", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("dove non esiste nemmeno `navigator` (Node 20, prove, server) non si rompe: elenco vuoto", async () => {
    vi.stubGlobal("navigator", undefined);
    expect(await listMics()).toEqual([]);
  });

  it("tiene solo gli ingressi audio e toglie le voci virtuali", async () => {
    const md = {
      enumerateDevices: async () => [
        dev("audioinput", "default", "Predefinito - A"),
        dev("audioinput", "communications", "Comunicazioni - A"),
        dev("audioinput", "a", "Microfono A"),
        dev("audioinput", "b", "Microfono B"),
        dev("videoinput", "cam", "Telecamera"),
        dev("audiooutput", "spk", "Altoparlante"),
      ],
    };
    expect(await listMics(md)).toEqual([
      { id: "a", label: "Microfono A" },
      { id: "b", label: "Microfono B" },
    ]);
  });

  it("senza supporto restituisce un elenco vuoto", async () => {
    expect(await listMics(undefined)).toEqual([]);
    expect(await listMics({} as MediaDevices)).toEqual([]);
  });
});

describe("il microfono scelto è ancora collegato?", () => {
  const list: MicDevice[] = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
  it("nessuna scelta o scelta presente: non manca", () => {
    expect(isMissing("", list)).toBe(false);
    expect(isMissing("b", list)).toBe(false);
  });
  it("scelta assente dall'elenco: manca", () => {
    expect(isMissing("c", list)).toBe(true);
  });
  it("senza permesso gli identificativi sono vuoti: non si può dire, quindi non manca", () => {
    expect(isMissing("c", [{ id: "", label: "" }])).toBe(false);
    expect(isMissing("c", [])).toBe(false);
  });
});

describe("apertura del microfono", () => {
  it("senza scelta apre il predefinito", async () => {
    const gum = vi.fn(async () => stream("default"));
    const r = await openMic("", {}, { getUserMedia: gum });
    expect(r.fellBack).toBe(false);
    expect(gum).toHaveBeenCalledWith({ audio: true });
  });

  it("con una scelta presente chiede proprio quel dispositivo", async () => {
    const gum = vi.fn(async () => stream("b"));
    const r = await openMic("b", { channelCount: 1 }, { getUserMedia: gum });
    expect(r.fellBack).toBe(false);
    expect(gum).toHaveBeenCalledTimes(1);
    expect(gum).toHaveBeenCalledWith({ audio: { channelCount: 1, deviceId: { exact: "b" } } });
  });

  it("scollegato (OverconstrainedError o NotFoundError): ripiega sul predefinito e lo dice", async () => {
    for (const name of ["OverconstrainedError", "NotFoundError"]) {
      const gum = vi.fn().mockRejectedValueOnce(err(name)).mockResolvedValueOnce(stream("default"));
      const r = await openMic("b", { channelCount: 1 }, { getUserMedia: gum });
      expect(r.fellBack).toBe(true);
      expect(gum).toHaveBeenNthCalledWith(2, { audio: { channelCount: 1 } });
    }
  });

  it("permesso negato non è un ripiego: l'errore passa e non si riprova", async () => {
    const gum = vi.fn().mockRejectedValue(err("NotAllowedError"));
    await expect(openMic("b", {}, { getUserMedia: gum })).rejects.toMatchObject({ name: "NotAllowedError" });
    expect(gum).toHaveBeenCalledTimes(1);
  });

  it("se non c'è nessun microfono nemmeno il predefinito, l'errore passa", async () => {
    const gum = vi.fn().mockRejectedValue(err("NotFoundError"));
    await expect(openMic("b", {}, { getUserMedia: gum })).rejects.toMatchObject({ name: "NotFoundError" });
    expect(gum).toHaveBeenCalledTimes(2);
  });
});
