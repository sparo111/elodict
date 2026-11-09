import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeWavPcm16 } from "./wav";
import { runSweep } from "./sweep";

const wav = (name: string) => {
  const b = fs.readFileSync(`prova-parakeet/public/audio/${name}`);
  return decodeWavPcm16(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
};
const haveAudio = fs.existsSync("prova-parakeet/public/audio/pause-naturali.wav");

describe.skipIf(!haveAudio)("pausa che chiude la frase (silenceMs) sulle registrazioni di prova", () => {
  it("decodifica i WAV (16 kHz, mono)", () => {
    const w = wav("frase-1.wav");
    expect(w.sampleRate).toBe(16000);
    expect(w.samples.length).toBeGreaterThan(16000 * 3);
  });
  it("stampa la tabella e rispetta i limiti ovvi", () => {
    const pn = wav("pause-naturali.wav").samples;
    const rows: string[] = [];
    for (const ms of [400, 550, 700, 900]) {
      const r = runSweep(pn, ms, 6);
      rows.push(`silenceMs ${ms}: emesse ${r.emitted}/${r.expected}, tagliate a metà ${r.splits}, ritardo medio ${r.meanDelayMs.toFixed(0)} ms`);
      // mai meno frasi del previsto (non si fondono frasi separate da 2 s) e il ritardo non è mai sotto la pausa richiesta
      expect(r.emitted).toBeGreaterThanOrEqual(6);
      expect(r.meanDelayMs).toBeGreaterThanOrEqual(ms - 40);
    }
    console.log(rows.join("\n"));
  });
});
