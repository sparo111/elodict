// Crea le icone dell'app installabile da public/favicon.svg. Si può rieseguire quando cambia il disegno:
//   npm run make-icons
// Usa Chromium di Playwright (già nelle dipendenze di sviluppo) per trasformare l'SVG in PNG.
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync("public/favicon.svg", "utf8");
mkdirSync("public/icons", { recursive: true });

/** Variante dell'SVG: angoli arrotondati (rx) e disegno rimpicciolito al centro (scale). */
function variant({ rx, scale }) {
  let s = svg.replace(/rx="14"/, `rx="${rx}"`);
  if (scale !== 1) {
    const t = `translate(32 32) scale(${scale}) translate(-32 -32)`;
    s = s.replace(/<g fill="#ffffff">/, `<g fill="#ffffff" transform="${t}">`);
  }
  return s;
}

const jobs = [
  // icone normali: angoli arrotondati del disegno originale
  { file: "icon-192.png", size: 192, svg: variant({ rx: 14, scale: 1 }) },
  { file: "icon-512.png", size: 512, svg: variant({ rx: 14, scale: 1 }) },
  // "maskable": tutto il quadrato pieno e il disegno dentro la zona sicura (il sistema ritaglia a cerchio o a squadrato)
  { file: "icon-maskable-512.png", size: 512, svg: variant({ rx: 0, scale: 0.62 }) },
  // iPhone/iPad: quadrato pieno, senza trasparenza (il sistema arrotonda da solo)
  { file: "apple-touch-icon.png", size: 180, svg: variant({ rx: 0, scale: 0.86 }) },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const j of jobs) {
    await page.setViewportSize({ width: j.size, height: j.size });
    const sized = j.svg.replace("<svg ", `<svg width="${j.size}" height="${j.size}" `);
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
    await page.screenshot({ path: `public/icons/${j.file}`, omitBackground: true, clip: { x: 0, y: 0, width: j.size, height: j.size } });
    console.log(`creata public/icons/${j.file} (${j.size}x${j.size})`);
  }
} finally {
  await browser.close();
}
