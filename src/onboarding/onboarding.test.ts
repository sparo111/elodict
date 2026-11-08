import { describe, expect, it } from "vitest";
import { estimateRemainingSeconds, formatEta, type EtaTexts } from "./eta";
import { requestMic } from "./mic";

const T: EtaTexts = { etaSeconds: "{n} secondi", etaMinute: "1 minuto", etaMinutes: "{n} minuti", etaAlmost: "pochi secondi" };

describe("estimateRemainingSeconds", () => {
  it("troppo presto per dirlo: nessuna stima", () => {
    expect(estimateRemainingSeconds(500, 50)).toBeNull(); // pochissimo tempo trascorso
    expect(estimateRemainingSeconds(10_000, 1)).toBeNull(); // quasi niente scaricato
    expect(estimateRemainingSeconds(10_000, 0)).toBeNull();
  });
  it("finito o oltre: nessuna stima", () => {
    expect(estimateRemainingSeconds(10_000, 100)).toBeNull();
    expect(estimateRemainingSeconds(10_000, 120)).toBeNull();
  });
  it("calcolo semplice: a metà dopo 10 secondi ne mancano altri 10", () => {
    expect(estimateRemainingSeconds(10_000, 50)).toBe(10);
  });
  it("a un quarto dopo 5 secondi ne mancano 15", () => {
    expect(estimateRemainingSeconds(5_000, 25)).toBe(15);
  });
  it("mai meno di un secondo", () => {
    expect(estimateRemainingSeconds(100_000, 99.9)).toBe(1);
  });
  it("valori strani non rompono nulla", () => {
    expect(estimateRemainingSeconds(Number.NaN, 50)).toBeNull();
    expect(estimateRemainingSeconds(5_000, Number.NaN)).toBeNull();
    expect(estimateRemainingSeconds(Number.POSITIVE_INFINITY, 50)).toBeNull();
  });
});

describe("formatEta", () => {
  it("pochissimo: «pochi secondi»", () => {
    expect(formatEta(1, T)).toBe("pochi secondi");
    expect(formatEta(9, T)).toBe("pochi secondi");
  });
  it("secondi arrotondati a 5", () => {
    expect(formatEta(10, T)).toBe("10 secondi");
    expect(formatEta(33, T)).toBe("35 secondi");
    expect(formatEta(47, T)).toBe("45 secondi");
  });
  it("vicino al minuto: un minuto, non «60 secondi»", () => {
    expect(formatEta(58, T)).toBe("1 minuto");
    expect(formatEta(60, T)).toBe("1 minuto");
  });
  it("minuti arrotondati per eccesso", () => {
    expect(formatEta(61, T)).toBe("2 minuti");
    expect(formatEta(120, T)).toBe("2 minuti");
    expect(formatEta(121, T)).toBe("3 minuti");
  });
});

const stream = (stopped: { n: number }) =>
  ({ getTracks: () => [{ stop: () => void stopped.n++ }, { stop: () => void stopped.n++ }] }) as unknown as MediaStream;
const reject = (name: string) => () => Promise.reject(Object.assign(new Error(name), { name }));

describe("requestMic", () => {
  it("permesso dato: ok, e il microfono si spegne subito", async () => {
    const stopped = { n: 0 };
    expect(await requestMic(async () => stream(stopped))).toBe("ok");
    expect(stopped.n).toBe(2);
  });
  it("permesso negato", async () => {
    expect(await requestMic(reject("NotAllowedError"))).toBe("denied");
    expect(await requestMic(reject("SecurityError"))).toBe("denied");
  });
  it("nessun microfono", async () => {
    expect(await requestMic(reject("NotFoundError"))).toBe("none");
  });
  it("qualsiasi altro errore: error, mai un crollo", async () => {
    expect(await requestMic(reject("AbortError"))).toBe("error");
    expect(await requestMic(() => Promise.reject("testo"))).toBe("error");
    expect(await requestMic(() => Promise.reject(null))).toBe("error");
  });
});
