import { expect, test } from "@playwright/test";
import { editor, say } from "./helpers";

// BUG-005: se si cambia lingua subito dopo l'apertura, le impostazioni salvate (lette un attimo dopo)
// non devono sovrascrivere la scelta, e il dizionario salvato non deve sparire.

/** Fa aprire il database del sito con 1,5 secondi di ritardo, per riprodurre sempre la stessa situazione. */
const SLOW_DB = `
  const realOpen = IDBFactory.prototype.open;
  IDBFactory.prototype.open = function (...args) {
    if (args[0] !== "elodict") return realOpen.apply(this, args);
    const fake = new EventTarget();
    fake.onsuccess = fake.onerror = fake.onupgradeneeded = fake.onblocked = null;
    fake.readyState = "pending"; fake.result = undefined; fake.error = null; fake.transaction = null; fake.source = null;
    setTimeout(() => {
      const real = realOpen.apply(this, args);
      for (const name of ["success", "error", "upgradeneeded", "blocked"]) {
        real.addEventListener(name, (ev) => {
          fake.result = real.result; fake.error = real.error; fake.transaction = real.transaction; fake.readyState = real.readyState;
          const h = fake["on" + name];
          if (h) h.call(fake, ev);
          fake.dispatchEvent(new Event(name));
        });
      }
    }, 1500);
    return fake;
  };
`;

test("RACE-1 cambiare lingua prima che le impostazioni siano lette: la scelta vale e il dizionario resta", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: "it-IT" });

  // 1) apertura normale: salvo una voce nel dizionario
  const first = await context.newPage();
  await first.goto("/");
  await first.getByRole("button", { name: "Impostazioni" }).click();
  await first.getByLabel("Come lo sente").fill("pippo");
  await first.getByLabel("Come lo vuoi").fill("Pippo");
  await first.getByRole("button", { name: "Aggiungi" }).click();
  await expect(first.getByRole("dialog").locator("li")).toHaveCount(1);
  await first.waitForTimeout(600);
  await first.close();

  // 2) apertura lenta: scelgo il francese mentre il database si sta ancora aprendo
  const page = await context.newPage();
  await page.addInitScript(SLOW_DB);
  await page.goto("/", { waitUntil: "commit" });
  const lang = page.getByRole("toolbar").getByRole("combobox");
  await lang.selectOption("fr");
  await expect(lang).toHaveValue("fr");
  await page.waitForTimeout(3500); // il database si apre, le impostazioni vengono lette
  await expect(lang).toHaveValue("fr"); // la scelta non è stata cancellata

  // 3) dopo il ricaricamento: la scelta c'è e il dizionario anche
  await page.reload({ waitUntil: "commit" });
  await page.waitForTimeout(3500);
  await expect(page.getByRole("toolbar").getByRole("combobox")).toHaveValue("fr");
  await page.getByRole("button", { name: /Impostazioni|Réglages/ }).click();
  await expect(page.getByRole("dialog").locator("li")).toContainText("Pippo");
  await context.close();
});

test("RACE-2 con il database lento, la prima scelta resta anche senza impostazioni salvate", async ({ page }) => {
  await page.addInitScript(SLOW_DB);
  await page.goto("/", { waitUntil: "commit" });
  await page.getByRole("toolbar").getByRole("combobox").selectOption("es");
  await page.waitForTimeout(3500);
  await expect(page.getByRole("toolbar").getByRole("combobox")).toHaveValue("es");
  await say(page, "signo de apertura de interrogación qué tal signo de interrogación");
  await expect(editor(page)).toContainText("¿Qué tal?");
});
