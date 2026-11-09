// Crea le icone dell'app (installabile, iPhone, scheda del browser) da design/icona-elodict.png (1254x1254). Si può rieseguire
// quando cambia il disegno:
//   npm run make-icons
// Usa Chromium di Playwright (già nelle dipendenze di sviluppo) per ridurre l'immagine: si dimezza a passi, poi l'ultimo
// passo porta alla misura finale, così le icone piccole restano nitide.
//
// Il sorgente sta FUORI da public/: non finisce nel sito. Il disegno occupa circa il 75% del quadrato (dentro il cerchio
// dell'80% della «zona sicura»), quindi la stessa immagine va bene anche per le icone «maskable».
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const SOURCE = "design/icona-elodict.png";
const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

const jobs = [
  { file: "icon-192.png", size: 192 }, // app installabile
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512 }, // stessa immagine: il disegno sta già dentro il cerchio dell'80%
  { file: "apple-touch-icon.png", size: 180 }, // iPhone/iPad: quadrato pieno, senza trasparenza
  { file: "favicon-32.png", size: 32 }, // scheda del browser
  { file: "favicon-48.png", size: 48 },
];

const png = readFileSync(SOURCE).toString("base64");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><canvas id=c></canvas>");
  const results = await page.evaluate(
    async ({ src, sizes }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${src}`;
      await img.decode();
      const out = {};
      for (const size of sizes) {
        let cur = document.createElement("canvas");
        cur.width = img.naturalWidth;
        cur.height = img.naturalHeight;
        cur.getContext("2d").drawImage(img, 0, 0);
        // dimezza finché non si è a meno del doppio della misura finale
        while (cur.width / 2 >= size * 1.0 && cur.width / 2 > size) {
          const next = document.createElement("canvas");
          next.width = Math.max(size, Math.round(cur.width / 2));
          next.height = next.width;
          const g = next.getContext("2d");
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = "high";
          g.drawImage(cur, 0, 0, next.width, next.height);
          cur = next;
        }
        if (cur.width !== size) {
          const last = document.createElement("canvas");
          last.width = size;
          last.height = size;
          const g = last.getContext("2d");
          g.imageSmoothingEnabled = true;
          g.imageSmoothingQuality = "high";
          g.drawImage(cur, 0, 0, size, size);
          cur = last;
        }
        out[size] = cur.toDataURL("image/png").split(",")[1];
      }
      return out;
    },
    { src: png, sizes: [...new Set(jobs.map((j) => j.size))] },
  );
  for (const j of jobs) {
    writeFileSync(`${OUT}/${j.file}`, Buffer.from(results[j.size], "base64"));
    console.log(`creata ${OUT}/${j.file} (${j.size}x${j.size})`);
  }
} finally {
  await browser.close();
}
