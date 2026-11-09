import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { watchErrors } from "./helpers";

/**
 * T001f: la finestra «Aggiungi Elodict alla schermata Home» su iPhone (WebKit, profilo iPhone 15, 390 px).
 * Progetto «pwa-iphone», versione costruita sulla porta 5200.
 */
// Il profilo iPhone 15 è largo 393 px; qui si prova anche a 390 px (iPhone più piccoli).
// T001h: 390 x 664 è l'altezza utile di Safari su iPhone (con le barre in alto e in basso).
test.use({ viewport: { width: 390, height: 664 } });

const PWA = "http://localhost:5200";
const T = {
  it: { locale: "it-IT", title: "Aggiungi Elodict alla schermata Home", how: "Come fare", share: "Apri il menu Condividi", hint: "Nel menu, scorri e tocca «Aggiungi alla schermata Home». Se non c'è, chiudi il menu e usa il pulsante Condividi di Safari, in fondo allo schermo.", arrow: "Tocca qui sotto", print: "Stampa le istruzioni", install: "Installa Elodict" },
  en: { locale: "en-US", title: "Add Elodict to your Home Screen", how: "How to do it", share: "Open the Share menu", hint: "In the menu, scroll and tap “Add to Home Screen”. If it is not there, close the menu and use Safari's Share button, at the bottom of the screen.", arrow: "Tap below", print: "Print the instructions", install: "Install Elodict" },
  fr: { locale: "fr-FR", title: "Ajoutez Elodict à l'écran d'accueil", how: "Comment faire", share: "Ouvrir le menu Partager", hint: "Dans le menu, faites défiler et touchez « Sur l'écran d'accueil ». S'il n'y est pas, fermez le menu et utilisez le bouton Partager de Safari, en bas de l'écran.", arrow: "Touchez en bas", print: "Imprimer les instructions", install: "Installer Elodict" },
  es: { locale: "es-ES", title: "Añade Elodict a la pantalla de inicio", how: "Cómo hacerlo", share: "Abrir el menú Compartir", hint: "En el menú, desliza y toca «Añadir a pantalla de inicio». Si no aparece, cierra el menú y usa el botón Compartir de Safari, abajo del todo.", arrow: "Toca aquí abajo", print: "Imprimir las instrucciones", install: "Instalar Elodict" },
} as const;

/** Simula navigator.share: registra le chiamate e, se richiesto, rifiuta con AbortError (l'utente annulla). */
async function fakeShare(page: Page, mode: "ok" | "cancel" | "missing") {
  await page.addInitScript((m) => {
    const w = window as unknown as { __shared: unknown[] };
    w.__shared = [];
    if (m === "missing") {
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      return;
    }
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: (data: unknown) => {
        w.__shared.push(data);
        return m === "cancel" ? Promise.reject(new DOMException("Share canceled", "AbortError")) : Promise.resolve();
      },
    });
  }, mode);
}

async function openDialog(page: Page, name: string, install: string) {
  await page.addInitScript(() => localStorage.setItem("elodict-onboarding", "done"));
  await page.goto(`${PWA}/`);
  await page.getByRole("button", { name: install }).first().click();
  const dlg = page.getByRole("dialog", { name });
  await expect(dlg).toBeVisible();
  return dlg;
}

for (const [lang, t] of Object.entries(T)) {
  test.describe(`finestra iPhone (${lang})`, () => {
    test.use({ locale: t.locale });

    test("«Come fare», passi senza aspetto da pulsante, pulsante Condividi, riga, freccia, axe a 390 px", async ({ page }) => {
      const errors = watchErrors(page);
      await fakeShare(page, "ok");
      const dlg = await openDialog(page, t.title, t.install);
      expect(page.viewportSize()).toEqual({ width: 390, height: 664 });

      // titolo «Come fare» sopra i passi
      const how = dlg.getByRole("heading", { name: t.how });
      await expect(how).toBeVisible();
      const items = dlg.getByRole("listitem");
      await expect(items).toHaveCount(3);
      expect((await how.boundingBox())!.y).toBeLessThan((await items.first().boundingBox())!.y);

      // i passi non sembrano pulsanti: niente bordo, ombra, sfondo, e non sono controlli
      for (let i = 0; i < 3; i++) {
        const st = await items.nth(i).evaluate((el) => {
          const c = getComputedStyle(el);
          return { shadow: c.boxShadow, bw: c.borderTopWidth + c.borderLeftWidth, bg: c.backgroundColor, radius: c.borderTopLeftRadius, cursor: c.cursor };
        });
        expect(st.shadow).toBe("none");
        expect(parseFloat(st.bw)).toBe(0);
        expect(st.bg).toBe("rgba(0, 0, 0, 0)");
        expect(st.radius).toBe("0px");
        expect(st.cursor).not.toBe("pointer");
      }
      await expect(dlg.locator("ol button, ol a, ol [role=button]")).toHaveCount(0);

      // pulsante grande; poi la riga; poi «Come fare»; per ultimo «Stampa le istruzioni»
      const btn = dlg.getByRole("button", { name: t.share });
      await expect(btn).toBeVisible();
      const bb = (await btn.boundingBox())!;
      expect(bb.height).toBeGreaterThanOrEqual(56);
      expect(bb.width).toBeGreaterThan(250);
      const hint = dlg.getByText(t.hint, { exact: true });
      await expect(hint).toBeVisible();
      const print = dlg.getByRole("link", { name: t.print });
      const [hb, pb] = [(await hint.boundingBox())!, (await print.boundingBox())!];
      const hw = (await how.boundingBox())!;
      expect(bb.y + bb.height).toBeLessThanOrEqual(hb.y);
      expect(hb.y + hb.height).toBeLessThanOrEqual(hw.y);
      expect(hw.y).toBeLessThan(pb.y);

      // freccia presente, animata, in fondo al centro, con la scritta
      const arrow = page.getByTestId("share-arrow");
      await expect(arrow).toBeVisible();
      await expect(arrow).toContainText(t.arrow);
      const ab = (await arrow.locator(".share-arrow").boundingBox())!;
      const vh = page.viewportSize()!;
      expect(Math.abs(ab.x + ab.width / 2 - vh.width / 2)).toBeLessThan(2);
      expect(vh.height - (ab.y + ab.height)).toBeLessThan(70);
      expect(await arrow.locator(".share-arrow").evaluate((el) => getComputedStyle(el).animationName)).toBe("share-arrow-bounce");

      // accessibilità (con la freccia e la finestra) e niente scorrimento orizzontale
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      errors();
    });

    test("T001h: il pulsante è il primo elemento, visibile senza scorrere a 390x664; la freccia non tocca la finestra né i pulsanti; il tocco sulla freccia non chiude", async ({ page }) => {
      await fakeShare(page, "ok");
      const dlg = await openDialog(page, t.title, t.install);
      const btn = dlg.getByRole("button", { name: t.share });
      await expect(btn).toBeVisible();
      await expect(btn).toBeInViewport({ ratio: 1 }); // tutto dentro lo schermo, senza scorrere
      const d = (await dlg.boundingBox())!;
      const bb = (await btn.boundingBox())!;
      // dentro la finestra, e non coperto: è l'elemento che si trova nel suo punto centrale
      expect(bb.y + bb.height).toBeLessThanOrEqual(d.y + d.height);
      expect(await btn.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el === top || el.contains(top); })).toBe(true);
      // primo elemento: sopra la riga, i passi e «Stampa»; sotto c'è solo il titolo con la X
      for (const other of [dlg.getByText(t.hint, { exact: true }), dlg.getByRole("heading", { name: t.how }), dlg.getByRole("link", { name: t.print })]) {
        expect((await other.boundingBox())!.y).toBeGreaterThan(bb.y);
      }
      const firstInteractive = await dlg.locator("button, a").first().evaluate((el) => el.textContent?.trim());
      expect(firstInteractive).toBe(""); // la X di chiusura (solo icona), poi subito il pulsante
      expect(await dlg.locator("button, a").nth(1).textContent()).toContain(t.share);

      // la freccia non si sovrappone mai alla finestra né a un pulsante (si campiona il rimbalzo)
      const arrow = page.getByTestId("share-arrow");
      const inner = arrow.locator(".share-arrow");
      const boxes = [(await arrow.boundingBox())!];
      for (let i = 0; i < 12; i++) {
        boxes.push((await inner.boundingBox())!);
        await page.waitForTimeout(100);
      }
      const buttons = await dlg.locator("button, a").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
      const hit = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      const dd = (await dlg.boundingBox())!;
      for (const a of boxes) {
        expect(hit(a, dd), "freccia contro finestra").toBe(false);
        // di ogni pulsante conta la parte visibile, cioè dentro la finestra (il resto è nell'area che scorre, ritagliato)
        for (const b of buttons) {
          const x = Math.max(b.x, dd.x), y = Math.max(b.y, dd.y);
          const vis = { x, y, width: Math.min(b.x + b.width, dd.x + dd.width) - x, height: Math.min(b.y + b.height, dd.y + dd.height) - y };
          if (vis.width > 0 && vis.height > 0) expect(hit(a, vis), "freccia contro pulsante").toBe(false);
        }
        expect(a.y + a.height).toBeLessThanOrEqual(page.viewportSize()!.height); // e sta tutta nello schermo
      }

      // toccando la freccia la finestra resta aperta
      const ab = (await inner.boundingBox())!;
      await page.touchscreen.tap(ab.x + ab.width / 2, ab.y + ab.height / 2);
      await page.waitForTimeout(300);
      await expect(dlg).toBeVisible();
    });

    test("il pulsante chiama navigator.share con titolo e indirizzo dell'app", async ({ page }) => {
      const errors = watchErrors(page);
      await fakeShare(page, "ok");
      const dlg = await openDialog(page, t.title, t.install);
      await dlg.getByRole("button", { name: t.share }).tap();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
      const data = await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared[0]);
      expect(data).toEqual({ title: "Elodict", url: `${PWA}/` });
      await expect(dlg).toBeVisible();
      errors();
    });

    test("se l'utente annulla non c'è nessun errore visibile né in console", async ({ page }) => {
      const errors = watchErrors(page);
      const warnings: string[] = [];
      page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
      await fakeShare(page, "cancel");
      const dlg = await openDialog(page, t.title, t.install);
      await dlg.getByRole("button", { name: t.share }).tap();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared.length)).toBe(1);
      await page.waitForTimeout(200);
      await expect(dlg).toBeVisible();
      await expect(dlg.getByRole("alert")).toHaveCount(0);
      expect(warnings.filter((w) => w.includes("Condividi"))).toEqual([]);
      errors();
    });
  });
}

test.describe("senza navigator.share", () => {
  test("il pulsante e la riga non ci sono, i passi sì", async ({ page }) => {
    await fakeShare(page, "missing");
    const dlg = await openDialog(page, T.it.title, T.it.install);
    await expect(dlg.getByRole("button", { name: T.it.share })).toHaveCount(0);
    await expect(dlg.getByText(T.it.hint, { exact: true })).toHaveCount(0);
    await expect(dlg.getByRole("listitem")).toHaveCount(3);
    await expect(dlg.getByRole("link", { name: T.it.print })).toBeVisible();
  });
});

test.describe("movimento ridotto", () => {
  test.use({ reducedMotion: "reduce" });
  test("con prefers-reduced-motion la freccia sta ferma (ma c'è)", async ({ page }) => {
    await fakeShare(page, "ok");
    await openDialog(page, T.it.title, T.it.install);
    const arrow = page.getByTestId("share-arrow");
    await expect(arrow).toBeVisible();
    expect(await arrow.locator(".share-arrow").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

test.describe("pulsante «Installa» in alto, sul telefono", () => {
  for (const [lang, t] of Object.entries(T)) {
    test.describe(lang, () => {
      test.use({ locale: t.locale });
      test("la scritta breve è visibile a 390 px, il nome accessibile la contiene, niente scorrimento orizzontale, axe", async ({ page }) => {
      await fakeShare(page, "ok");
      await page.addInitScript(() => localStorage.setItem("elodict-onboarding", "done"));
      await page.goto(`${PWA}/`);
      const btn = page.getByRole("button", { name: t.install }).first();
      await expect(btn).toBeVisible();
      const short = { it: "Installa", en: "Install", fr: "Installer", es: "Instalar" }[lang as "it"];
      const label = btn.getByText(short, { exact: true });
      await expect(label).toBeVisible();
      await expect(btn).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      });
    });
  }
});
