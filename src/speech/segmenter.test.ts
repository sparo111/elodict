import { describe, expect, it } from "vitest";
import { cleanWhisperText, resampleTo16k, Segmenter } from "./segmenter";

const SR = 16000;
/** Un tono finto (voce) o silenzio, della durata richiesta. */
const tone = (ms: number, amp = 0.2) => {
  const a = new Float32Array((SR * ms) / 1000);
  for (let i = 0; i < a.length; i++) a[i] = amp * Math.sin((2 * Math.PI * 220 * i) / SR);
  return a;
};
const silence = (ms: number, amp = 0.001) => {
  const a = new Float32Array((SR * ms) / 1000);
  for (let i = 0; i < a.length; i++) a[i] = amp * (i % 2 ? 1 : -1);
  return a;
};
const cat = (...parts: Float32Array[]) => {
  const a = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    a.set(p, at);
    at += p.length;
  }
  return a;
};

describe("Segmenter: taglia le frasi dalle pause", () => {
  it("una frase seguita da pausa lunga esce una volta sola", () => {
    const s = new Segmenter();
    const out = s.push(cat(silence(500), tone(1000), silence(1000)));
    expect(out).toHaveLength(1);
    expect(out[0].durationMs).toBeGreaterThan(1000);
    expect(out[0].peak).toBeGreaterThan(0.1);
  });
  it("due frasi separate da una pausa sono due frasi", () => {
    const s = new Segmenter();
    const out = s.push(cat(tone(800), silence(1000), tone(800), silence(1000)));
    expect(out).toHaveLength(2);
  });
  it("una pausa breve non spezza la frase", () => {
    const s = new Segmenter();
    const out = s.push(cat(tone(600), silence(300), tone(600), silence(1000)));
    expect(out).toHaveLength(1);
  });
  it("il silenzio da solo non produce nulla", () => {
    const s = new Segmenter();
    expect(s.push(silence(5000))).toHaveLength(0);
    expect(s.flush()).toBeNull();
  });
  it("un rumore brevissimo viene scartato", () => {
    const s = new Segmenter();
    expect(s.push(cat(silence(500), tone(60), silence(1200)))).toHaveLength(0);
  });
  it("funziona anche se l'audio arriva a pezzettini", () => {
    const s = new Segmenter();
    const all = cat(silence(300), tone(900), silence(1000));
    const out = [];
    for (let i = 0; i < all.length; i += 128) out.push(...s.push(all.slice(i, i + 128)));
    expect(out).toHaveLength(1);
  });
  it("flush chiude la frase che stava per finire (tasto Ferma)", () => {
    const s = new Segmenter();
    expect(s.push(cat(silence(300), tone(900)))).toHaveLength(0);
    const u = s.flush();
    expect(u).not.toBeNull();
    expect(u!.durationMs).toBeGreaterThan(800);
  });
  it("una frase lunghissima viene tagliata", () => {
    const s = new Segmenter({ maxUtteranceMs: 2000 });
    expect(s.push(tone(5000)).length).toBeGreaterThanOrEqual(2);
  });
  it("si adatta al rumore di fondo: un rumore costante non è voce", () => {
    const s = new Segmenter();
    expect(s.push(silence(4000, 0.01))).toHaveLength(0);
  });
});

describe("resampleTo16k", () => {
  it("da 48.000 a 16.000: un terzo dei campioni", () => {
    const r = resampleTo16k(new Float32Array(4800).fill(0.5), 48000);
    expect(r.length).toBe(1600);
    expect(r[10]).toBeCloseTo(0.5);
  });
  it("a 16.000 non cambia nulla", () => {
    const a = new Float32Array([1, 2, 3]);
    expect(resampleTo16k(a, 16000)).toBe(a);
  });
});

describe("cleanWhisperText: scarta le frasi inventate sul silenzio", () => {
  it("tiene il testo normale", () => {
    expect(cleanWhisperText(" Ciao, come stai? ")).toBe("Ciao, come stai?");
  });
  it("toglie le etichette tra parentesi", () => {
    expect(cleanWhisperText("[BLANK_AUDIO]")).toBe("");
    expect(cleanWhisperText("(musica)")).toBe("");
    expect(cleanWhisperText("Ciao [Music] mondo")).toBe("Ciao mondo");
  });
  it("scarta solo punteggiatura", () => {
    expect(cleanWhisperText("...")).toBe("");
  });
  it("scarta le frasi tipiche inventate", () => {
    expect(cleanWhisperText("Thank you.")).toBe("");
    expect(cleanWhisperText("Thanks for watching!")).toBe("");
    expect(cleanWhisperText("Sottotitoli e revisione a cura di QTSS")).toBe("");
  });
  it("ma non tocca una frase vera che contiene quelle parole", () => {
    expect(cleanWhisperText("Thank you for the invitation")).toBe("Thank you for the invitation");
  });
});
