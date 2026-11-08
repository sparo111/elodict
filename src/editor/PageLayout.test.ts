import { describe, expect, it } from "vitest";
import { PAGE, PAGE_CONTENT_HEIGHT, PAGE_PITCH, planPages, type Line } from "./PageLayout";

/** Righe alte 26 px, una sotto l'altra, a partire dal margine in alto. */
const lines = (n: number, h = 26): Line[] =>
  Array.from({ length: n }, (_, i) => ({ top: PAGE.marginTop + i * h, bottom: PAGE.marginTop + (i + 1) * h, pos: i * 10 }));

describe("impaginazione A4", () => {
  it("il foglio è A4: 210 × 297 mm a 96 punti per pollice", () => {
    expect(PAGE.width).toBe(794);
    expect(PAGE.height).toBe(1123);
    expect(PAGE.height / PAGE.width).toBeCloseTo(297 / 210, 3);
  });
  it("poche righe: un foglio e nessuno spazio", () => {
    const r = planPages(lines(10));
    expect(r.pages).toBe(1);
    expect(r.spacers).toEqual([]);
  });
  it("esattamente quante righe ne stanno in un foglio: ancora un foglio", () => {
    const fit = Math.floor(PAGE_CONTENT_HEIGHT / 26);
    expect(planPages(lines(fit)).pages).toBe(1);
  });
  it("una riga in più: secondo foglio, con uno spazio che la porta in cima", () => {
    const fit = Math.floor(PAGE_CONTENT_HEIGHT / 26);
    const l = lines(fit + 1);
    const r = planPages(l);
    expect(r.pages).toBe(2);
    expect(r.spacers).toHaveLength(1);
    expect(r.spacers[0].pos).toBe(l[fit].pos);
    // la riga spostata finisce esattamente all'inizio dell'area utile del secondo foglio
    expect(l[fit].top + r.spacers[0].height).toBeCloseTo(PAGE_PITCH + PAGE.marginTop, 5);
  });
  it("tre fogli di testo = tre fogli, due spazi", () => {
    const fit = Math.floor(PAGE_CONTENT_HEIGHT / 26);
    const r = planPages(lines(fit * 2 + 5));
    expect(r.pages).toBe(3);
    expect(r.spacers).toHaveLength(2);
  });
  it("nessuna riga finisce a cavallo di due fogli", () => {
    const l = lines(200);
    const { spacers } = planPages(l);
    let offset = 0;
    for (const line of l) {
      const s = spacers.find((x) => x.pos === line.pos);
      if (s) offset += s.height;
      const top = line.top + offset;
      const bottom = line.bottom + offset;
      const page = Math.floor((top - PAGE.marginTop + 1) / PAGE_PITCH);
      const start = page * PAGE_PITCH + PAGE.marginTop;
      expect(top).toBeGreaterThanOrEqual(start - 0.01);
      expect(bottom).toBeLessThanOrEqual(start + PAGE_CONTENT_HEIGHT + 0.5);
    }
  });
  it("righe di altezze diverse (titoli): resta tutto dentro i fogli", () => {
    const l: Line[] = [];
    let y: number = PAGE.marginTop;
    for (let i = 0; i < 120; i++) {
      const h = i % 7 === 0 ? 40 : 26;
      l.push({ top: y, bottom: y + h, pos: i });
      y += h + (i % 5 === 0 ? 12 : 0);
    }
    const { spacers, pages } = planPages(l);
    expect(pages).toBeGreaterThan(1);
    let offset = 0;
    for (const line of l) {
      const s = spacers.find((x) => x.pos === line.pos);
      if (s) offset += s.height;
      const top = line.top + offset;
      const page = Math.floor((top - PAGE.marginTop + 1) / PAGE_PITCH);
      expect(line.bottom + offset).toBeLessThanOrEqual(page * PAGE_PITCH + PAGE.marginTop + PAGE_CONTENT_HEIGHT + 0.5);
    }
  });
  it("nessuna riga: un foglio vuoto", () => {
    expect(planPages([])).toEqual({ spacers: [], pages: 1 });
  });
  it("una riga alta più del foglio non manda in tilt il calcolo", () => {
    const r = planPages([{ top: 96, bottom: 96 + 2000, pos: 1 }]);
    expect(r.pages).toBe(1);
  });
});
