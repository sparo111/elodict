import { describe, expect, it } from "vitest";
import type { Node as PMNode } from "@tiptap/pm/model";
import { LineCache } from "./measure";

const node = () => ({}) as PMNode; // la memoria guarda solo l'identità del blocco

describe("memoria delle righe misurate", () => {
  it("ritrova un blocco già misurato e non uno nuovo", () => {
    const cache = new LineCache();
    const a = node();
    cache.set(a, [{ top: 0, bottom: 24, pos: 0 }]);
    expect(cache.get(a)).toEqual([{ top: 0, bottom: 24, pos: 0 }]);
    expect(cache.get(node())).toBeUndefined(); // blocco modificato = oggetto nuovo
    expect(cache.measured).toBe(1);
  });

  it("si svuota se cambiano larghezza o zoom, non se la chiave è la stessa", () => {
    const cache = new LineCache();
    const a = node();
    cache.check("602@1");
    cache.set(a, []);
    cache.check("602@1");
    expect(cache.get(a)).toEqual([]);
    cache.check("602@0.5");
    expect(cache.get(a)).toBeUndefined();
  });

  it("clear() lo svuota (caratteri appena caricati)", () => {
    const cache = new LineCache();
    const a = node();
    cache.check("1@1");
    cache.set(a, []);
    cache.clear();
    expect(cache.get(a)).toBeUndefined();
  });
});
