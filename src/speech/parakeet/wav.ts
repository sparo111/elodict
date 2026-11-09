// Legge un file WAV semplice (PCM a 16 bit, mono) e lo porta a numeri da -1 a 1. Serve alle prove, non all'app.
export function decodeWavPcm16(buf: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("non è un file WAV");
  let pos = 12;
  let sampleRate = 16000;
  let channels = 1;
  let bits = 16;
  while (pos + 8 <= v.byteLength) {
    const id = tag(pos);
    const size = v.getUint32(pos + 4, true);
    if (id === "fmt ") {
      channels = v.getUint16(pos + 10, true);
      sampleRate = v.getUint32(pos + 12, true);
      bits = v.getUint16(pos + 22, true);
    } else if (id === "data") {
      if (bits !== 16 || channels !== 1) throw new Error("serve un WAV mono a 16 bit");
      const n = Math.min(size, v.byteLength - pos - 8) / 2;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = v.getInt16(pos + 8 + i * 2, true) / 32768;
      return { samples: out, sampleRate };
    }
    pos += 8 + size + (size % 2);
  }
  throw new Error("nel WAV non ci sono dati");
}
