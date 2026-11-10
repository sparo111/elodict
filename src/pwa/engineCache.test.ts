import { afterEach, describe, expect, it, vi } from "vitest";
import { ENGINE_CACHE, ENGINE_FILES, warmEngineCache, type EngineCacheDeps } from "./engineCache";

/** Una «memoria» finta: tiene le risposte per indirizzo. */
function fakeCaches(initial: Record<string, string> = {}) {
  const stored = new Map<string, string>(Object.entries(initial));
  const opened: string[] = [];
  const caches = {
    open: async (name: string) => {
      opened.push(name);
      return {
        match: async (url: string) => (stored.has(url) ? ({ url } as unknown as Response) : undefined),
        put: async (url: string, res: Response) => void stored.set(url, await res.text()),
      } as unknown as Cache;
    },
  };
  return { caches, stored, opened };
}

const deps = (over: Partial<EngineCacheDeps>, c = fakeCaches()): EngineCacheDeps => ({
  caches: c.caches,
  fetch: async (url) => new Response(`contenuto di ${url}`),
  base: "/elodict/",
  origin: "https://sparo111.github.io",
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("file del motore per l'uso senza rete", () => {
  it("salva i due file che servono, nella memoria che usa anche il service worker, con l'indirizzo completo", async () => {
    const c = fakeCaches();
    expect(await warmEngineCache("ort", deps({}, c))).toBe(2);
    expect(c.opened).toEqual([ENGINE_CACHE]);
    expect([...c.stored.keys()].sort()).toEqual(ENGINE_FILES.map((f) => `https://sparo111.github.io/elodict/ort/${f}`).sort());
    expect(c.stored.get(`https://sparo111.github.io/elodict/ort/${ENGINE_FILES[0]}`)).toContain("contenuto di");
  });

  it("per Parakeet usa la cartella ort31, non ort", async () => {
    const c = fakeCaches();
    await warmEngineCache("ort31", deps({}, c));
    expect([...c.stored.keys()].every((u) => u.includes("/elodict/ort31/"))).toBe(true);
  });

  it("non riscarica ciò che c'è già", async () => {
    const present = `https://sparo111.github.io/elodict/ort/${ENGINE_FILES[0]}`;
    const c = fakeCaches({ [present]: "già qui" });
    const fetched: string[] = [];
    const n = await warmEngineCache("ort", deps({ fetch: async (u) => (fetched.push(u), new Response("x")) }, c));
    expect(n).toBe(1);
    expect(fetched).toEqual([`https://sparo111.github.io/elodict/ort/${ENGINE_FILES[1]}`]);
    expect(c.stored.get(present)).toBe("già qui");
  });

  it("senza nessuna richiesta se è già tutto salvato", async () => {
    const all = Object.fromEntries(ENGINE_FILES.map((f) => [`https://sparo111.github.io/elodict/ort/${f}`, "ok"]));
    const fetchFn = vi.fn(async () => new Response("x"));
    expect(await warmEngineCache("ort", deps({ fetch: fetchFn }, fakeCaches(all)))).toBe(0);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("una risposta d'errore del sito (404, 500) non viene salvata", async () => {
    const c = fakeCaches();
    expect(await warmEngineCache("ort", deps({ fetch: async () => new Response("no", { status: 404 }) }, c))).toBe(0);
    expect(c.stored.size).toBe(0);
  });

  it("senza rete non lancia errori e lo dice nella console; ciò che era già salvato resta", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const c = fakeCaches();
    const n = await warmEngineCache("ort", deps({ fetch: async () => Promise.reject(new TypeError("Failed to fetch")) }, c));
    expect(n).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("senza memoria del browser (caches che si rompe) non lancia errori", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const broken = { open: async () => Promise.reject(new Error("niente memoria")) };
    expect(await warmEngineCache("ort", deps({ caches: broken }))).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("rispetta una base diversa (sito alla radice)", async () => {
    const c = fakeCaches();
    await warmEngineCache("ort", deps({ base: "/", origin: "http://localhost:5199" }, c));
    expect([...c.stored.keys()]).toContain(`http://localhost:5199/ort/${ENGINE_FILES[1]}`);
  });
});
