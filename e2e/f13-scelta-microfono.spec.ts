import { expect, test, type Page } from "@playwright/test";
import { watchErrors } from "./helpers";

/**
 * Scelta del microfono (T003). I dispositivi sono finti: l'elenco e le richieste di apertura sono sostituiti
 * da un copione, mentre l'audio vero viene dal microfono finto di Chrome.
 * Il copione espone: window.__gum (le richieste: identificativo chiesto o null), window.__streams,
 * window.__setDevices(ids, senzaNomi) per collegare/scollegare dispositivi.
 */
const FAKE_MICS = `
(() => {
  const md = navigator.mediaDevices;
  const origGum = md.getUserMedia.bind(md);
  window.__present = [
    { deviceId: "mic-a", label: "Microfono A" },
    { deviceId: "mic-b", label: "Microfono B" },
  ];
  window.__gum = [];
  window.__streams = [];
  md.enumerateDevices = async () => [
    { kind: "audioinput", deviceId: "default", label: "Predefinito - Microfono A" },
    { kind: "audioinput", deviceId: "communications", label: "Comunicazioni - Microfono A" },
    ...window.__present.map((d) => ({ kind: "audioinput", ...d })),
    { kind: "videoinput", deviceId: "cam", label: "Telecamera" },
  ];
  md.getUserMedia = async (c) => {
    const exact = c && c.audio && c.audio.deviceId && c.audio.deviceId.exact;
    window.__gum.push(exact ?? null);
    if (exact && !window.__present.some((d) => d.deviceId === exact)) throw new DOMException("scollegato", "OverconstrainedError");
    const audio = c && typeof c.audio === "object" ? { ...c.audio } : true;
    if (audio !== true) delete audio.deviceId;
    const st = await origGum({ audio });
    window.__streams.push(st);
    return st;
  };
  window.__setDevices = (ids, noNames) => {
    window.__present = ids.map((id) => ({ deviceId: id, label: noNames ? "" : "Microfono " + id.slice(-1).toUpperCase() }));
    md.dispatchEvent(new Event("devicechange"));
  };
})();
`;

const openSettings = (page: Page) => page.getByRole("button", { name: "Impostazioni" }).click();
const micSelect = (page: Page) => page.getByLabel("Microfono", { exact: true });
const gumLog = (page: Page) => page.evaluate(() => (window as unknown as { __gum: (string | null)[] }).__gum);
const setDevices = (page: Page, ids: string[], noNames = false) =>
  page.evaluate(([i, n]) => (window as unknown as { __setDevices: (a: string[], b: boolean) => void }).__setDevices(i as string[], n as boolean), [ids, noNames] as const);

/** La scelta è stata scritta nel salvataggio del browser? (si legge il database vero, senza attese a tempo) */
const storedMic = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const open = indexedDB.open("elodict");
        open.onsuccess = () => {
          const get = open.result.transaction("settings").objectStore("settings").get("main");
          get.onsuccess = () => {
            open.result.close();
            resolve(get.result?.microphoneId ?? null);
          };
        };
      }),
  );

test.beforeEach(async ({ page }) => {
  await page.addInitScript(FAKE_MICS);
  await page.goto("/");
});

test.describe("Scelta del microfono", () => {
  test("MIC-H1 l'elenco mostra il predefinito e i due microfoni, senza telecamere né voci doppie", async ({ page }) => {
    const check = watchErrors(page);
    await openSettings(page);
    const options = await micSelect(page).locator("option").allTextContents();
    expect(options).toEqual(["Quello predefinito del sistema", "Microfono A", "Microfono B"]);
    check();
  });

  test("MIC-H2 la prova usa il microfono scelto e la scelta resta dopo il ricaricamento", async ({ page }) => {
    await openSettings(page);
    await micSelect(page).selectOption({ label: "Microfono B" });
    await expect.poll(() => storedMic(page)).toBe("mic-b");

    await page.getByRole("button", { name: "Prova il microfono" }).click();
    await expect(page.getByText(/Microfono in uso:/)).toBeVisible();
    expect((await gumLog(page)).at(-1)).toBe("mic-b");

    await page.reload();
    await openSettings(page);
    await expect(micSelect(page)).toHaveValue("mic-b");
  });

  test("MIC-H3 un microfono collegato mentre la finestra è aperta compare nell'elenco", async ({ page }) => {
    await openSettings(page);
    await expect(micSelect(page).locator("option")).toHaveCount(3);
    await setDevices(page, ["mic-a", "mic-b", "mic-c"]);
    await expect(micSelect(page).locator("option", { hasText: "Microfono C" })).toHaveCount(1);
  });

  test("MIC-H4 tornare a «predefinito» chiede il microfono senza identificativo", async ({ page }) => {
    await openSettings(page);
    await micSelect(page).selectOption({ label: "Microfono B" });
    await micSelect(page).selectOption("");
    await expect.poll(() => storedMic(page)).toBe("");
    await page.getByRole("button", { name: "Prova il microfono" }).click();
    await expect(page.getByText(/Microfono in uso:/)).toBeVisible();
    expect((await gumLog(page)).at(-1)).toBeNull();
  });

  test("MIC-N1 microfono scelto poi scollegato: la prova usa il predefinito e lo dice, senza errori", async ({ page }) => {
    await openSettings(page);
    await micSelect(page).selectOption({ label: "Microfono B" });
    await expect.poll(() => storedMic(page)).toBe("mic-b");

    await setDevices(page, ["mic-a"]); // B scollegato
    const sel = micSelect(page);
    await expect(sel.locator("option:checked")).toHaveText(/non è collegato/);

    await page.getByRole("button", { name: "Prova il microfono" }).click();
    await expect(page.getByText(/Microfono in uso:/)).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Il microfono scelto non è collegato: uso quello predefinito del sistema." })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect((await gumLog(page)).slice(-2)).toEqual(["mic-b", null]); // prima il scelto, poi il predefinito
  });

  test("MIC-N2 senza permesso i nomi non ci sono: lo dice, e con i nomi vuoti si numerano", async ({ page }) => {
    await openSettings(page);
    await setDevices(page, ["", ""], true); // il browser nasconde nomi e identificativi
    await expect(page.getByText(/I nomi dei microfoni compaiono dopo/)).toBeVisible();
    await expect(micSelect(page).locator("option")).toHaveCount(1);
    await setDevices(page, ["mic-a", "mic-b"], true); // identificativi ma non i nomi
    await expect(micSelect(page).locator("option", { hasText: "Microfono 2" })).toHaveCount(1);
  });

  test("MIC-N3 la scelta di un microfono si può cambiare mentre la prova è in corso", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Prova il microfono" }).click();
    await expect(page.getByRole("button", { name: "Ferma la prova" })).toBeVisible();
    await micSelect(page).selectOption({ label: "Microfono B" });
    await expect(page.getByRole("button", { name: "Prova il microfono" })).toBeVisible(); // la prova si è fermata
    await page.getByRole("button", { name: "Prova il microfono" }).click();
    expect((await gumLog(page)).at(-1)).toBe("mic-b");
  });

  test("MIC-E1 con «il browser» a dettare si dice che la scelta non lo riguarda; con Whisper no", async ({ page }) => {
    await openSettings(page);
    const note = page.getByText(/Con «Il browser» la voce è ascoltata dal browser/);
    await expect(note).toBeVisible();
    await page.getByLabel(/Offline nel browser, con Whisper/).check();
    await expect(note).toHaveCount(0);
  });
});

// ---- Con Whisper vero (scarica il modello piccolo): il microfono scelto viene davvero chiesto, e se sparisce si ripiega ----
async function hfReachable(): Promise<boolean> {
  try {
    const r = await fetch("https://huggingface.co/Xenova/whisper-tiny/resolve/main/config.json", { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15_000) });
    return r.ok;
  } catch {
    return false;
  }
}

test.describe("Con Whisper vero", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 800, "il modello si scarica una volta sola, sul computer");
  test.setTimeout(240_000);

  test("MIC-W1 usa il microfono scelto; se si scollega riparte con il predefinito; se manca all'avvio ripiega", async ({ page }) => {
    test.skip(!(await hfReachable()), "huggingface.co non raggiungibile da questo computer");
    const talk = () => page.getByRole("button", { name: /^(Detta|Ferma)/ }).last();
    // «Ferma» compare subito, anche mentre il modello si scarica: si aspetta la scritta «Ti ascolto…»
    const listening = () => page.getByRole("status").filter({ hasText: /^Ti ascolto/ });

    await openSettings(page);
    await page.getByLabel(/Offline nel browser, con Whisper/).check();
    await page.getByLabel("Modello offline").selectOption("tiny");
    await micSelect(page).selectOption({ label: "Microfono B" });
    await expect.poll(() => storedMic(page)).toBe("mic-b");
    await page.keyboard.press("Escape");

    // 1) parte con il microfono scelto
    await talk().click();
    await expect(listening()).toBeVisible({ timeout: 200_000 });
    expect((await gumLog(page)).at(-1)).toBe("mic-b");
    await expect(page.getByText("Il microfono si è scollegato")).toHaveCount(0);

    // 2) si scollega mentre si ascolta: riparte da solo con il predefinito e avvisa
    await setDevices(page, ["mic-a"]);
    await page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.at(-1)!.getAudioTracks()[0].dispatchEvent(new Event("ended")));
    await expect(page.getByRole("status").filter({ hasText: "Il microfono si è scollegato: continuo con quello predefinito del sistema." })).toBeVisible();
    await expect(listening()).toBeVisible(); // continua ad ascoltare
    expect((await gumLog(page)).at(-1)).toBeNull();

    // 3) si ferma; poi, con B ancora scollegato, riavviando si ripiega con avviso
    await talk().click();
    await expect(talk()).toHaveAccessibleName(/Detta/);
    await talk().click();
    await expect(listening()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("status").filter({ hasText: "Il microfono scelto non è collegato: uso quello predefinito del sistema." })).toBeVisible();
    expect((await gumLog(page)).slice(-2)).toEqual(["mic-b", null]);
    await talk().click();
  });
});
