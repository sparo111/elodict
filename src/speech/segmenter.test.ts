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

/** Rumore bianco con RMS dato, sempre uguale (generatore deterministico) così la prova non è mai instabile. */
const noise = (ms: number, rms: number, seed = 7) => {
  let x = seed;
  const rnd = () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = new Float32Array((SR * ms) / 1000);
  for (let i = 0; i < a.length; i++) a[i] = rms * Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());
  return a;
};
const mix = (a: Float32Array, b: Float32Array) => a.map((v, i) => v + b[i]);
/** Una frase di voce (tono) sopra un fondo rumoroso, poi una pausa con il solo fondo. */
const phrase = (speechMs: number, pauseMs: number, bg: number) => cat(mix(tone(speechMs), noise(speechMs, bg)), noise(pauseMs, bg));
const loud = <T extends { peak: number }>(us: T[]) => us.filter((u) => u.peak > 0.1);

describe("Segmenter: microfoni con un fondo rumoroso (guasto T013z)", () => {
  // Molti microfoni (computer, telefoni, con il volume automatico) hanno un fondo sopra la soglia minima: prima, la frase
  // «iniziava» subito e non finiva più (la pausa non arrivava mai), e il testo compariva solo ogni 20 secondi, o mai.
  for (const bg of [0.02, 0.03]) {
    it(`fondo costante di ${bg} (RMS): 3 frasi dette con pause sono 3 frasi, non una lunghissima`, () => {
      const s = new Segmenter();
      const out = s.push(cat(noise(3000, bg), phrase(1500, 1500, bg), phrase(1500, 1500, bg), phrase(1500, 1500, bg)));
      const last = s.flush();
      const all = last ? [...out, last] : out;
      const voice = loud(all);
      expect(voice).toHaveLength(3);
      for (const u of voice) expect(u.durationMs).toBeLessThan(4000);
    });
    it(`fondo di ${bg} e voce che parte subito: dopo l'adattamento le frasi si separano`, () => {
      const s = new Segmenter();
      const out = s.push(cat(phrase(1500, 1500, bg), phrase(1500, 1500, bg), phrase(1500, 1500, bg), phrase(1500, 1500, bg), phrase(1500, 1500, bg)));
      const last = s.flush();
      const voice = loud(last ? [...out, last] : out);
      expect(voice.length).toBeGreaterThanOrEqual(3);
      for (const u of voice.slice(-3)) expect(u.durationMs).toBeLessThan(4000);
    });
  }
  it("una frase lunga senza pause (voce che sale e scende) non viene spezzata dall'adattamento", () => {
    const s = new Segmenter();
    const n = SR * 8;
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = (0.1 + 0.1 * Math.sin((2 * Math.PI * 4 * i) / SR)) * Math.sin((2 * Math.PI * 200 * i) / SR);
    const out = s.push(cat(noise(1000, 0.003), mix(a, noise(8000, 0.003)), noise(1200, 0.003)));
    expect(loud(out)).toHaveLength(1);
    expect(out[0].durationMs).toBeGreaterThan(7500);
  });
  it("il solo fondo rumoroso, senza nessuno che parli, non manda frasi a Whisper dopo l'adattamento", () => {
    const s = new Segmenter();
    s.push(noise(4000, 0.02)); // l'adattamento
    expect(s.push(noise(10000, 0.02, 11))).toHaveLength(0);
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
