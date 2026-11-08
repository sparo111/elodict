import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { editor, say, watchErrors } from "./helpers";
import { makeDoc, putDocuments, readRawDatabase } from "./dbhelpers";

const DAY = 24 * 60 * 60 * 1000;
const dialog = (page: Page) => page.getByRole("dialog", { name: "I tuoi documenti" });
const openList = async (page: Page) => {
  await page.getByRole("button", { name: "Documenti" }).click();
  await expect(dialog(page)).toBeVisible();
};
const saved = (page: Page) => expect(page.getByRole("status").filter({ hasText: /^Salvato/ })).toBeVisible();
const item = (page: Page, title: string) => dialog(page).getByRole("button", { name: `Apri «${title}»` });
const act = (page: Page, verb: string, title: string) => dialog(page).getByRole("button", { name: `${verb} «${title}»` });

/** Tre documenti salvati in anticipo, il più recente è «Terzo». Si parte dall'app già avviata e si ricarica. */
async function seedThree(page: Page) {
  await page.goto("/");
  await expect(editor(page)).toBeVisible();
  const t = Date.now() - 10 * DAY;
  await putDocuments(page, [
    makeDoc("a", "Primo", "lettera al condominio sull'assemblea", t),
    makeDoc("b", "Secondo", "verbale della riunione, perché serve", t + 1000),
    makeDoc("c", "Terzo", "appunti sparsi di gamma", t + 2000),
  ]);
  await page.reload();
  await expect(editor(page)).toContainText("appunti sparsi di gamma");
}

test.describe("Elenco dei documenti", () => {
  test("LIB-H1 senza documenti lo dice; scrivendo, il documento compare con titolo e anteprima", async ({ page }) => {
    const check = watchErrors(page);
    await page.goto("/");
    await openList(page);
    await expect(dialog(page)).toContainText("Non hai ancora documenti salvati");
    await page.keyboard.press("Escape");

    await say(page, "alfa beta gamma punto");
    await saved(page);
    await openList(page);
    await expect(item(page, "Alfa beta gamma")).toBeVisible();
    const row = dialog(page).getByRole("listitem");
    await expect(row).toContainText("Alfa beta gamma.");
    await expect(row).toContainText("aperto");
    check();
  });

  test("LIB-H2 nuovo documento: l'editor è vuoto, i due si distinguono, e «annulla» non riporta il testo dell'altro", async ({ page }) => {
    await page.goto("/");
    await say(page, "primo testo punto");
    await saved(page);
    await openList(page);
    await dialog(page).getByRole("button", { name: "Nuovo documento" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(editor(page)).toHaveText("");

    await say(page, "secondo testo punto");
    await saved(page);
    await openList(page);
    await expect(item(page, "Primo testo")).toBeVisible();
    await expect(item(page, "Secondo testo")).toBeVisible();

    await item(page, "Primo testo").click();
    await expect(editor(page)).toHaveText("Primo testo.");
    // «annulla» non deve riportare dentro il testo dell'altro documento
    await editor(page).click();
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await expect(editor(page)).toHaveText("Primo testo.");
  });

  test("LIB-H3 rinominare: il nome scelto resta anche scrivendo ancora, e il file esportato lo usa", async ({ page }) => {
    await page.goto("/");
    await say(page, "bozza iniziale punto");
    await saved(page);
    await openList(page);
    await act(page, "Rinomina", "Bozza iniziale").click();
    await dialog(page).getByLabel("Nuovo nome").fill("Lettera importante");
    await dialog(page).getByRole("button", { name: "Salva il nome" }).click();
    await expect(item(page, "Lettera importante")).toBeVisible();
    await page.keyboard.press("Escape");

    await say(page, "altre parole aggiunte");
    await saved(page);
    const raw = await readRawDatabase(page);
    expect(raw.documents).toHaveLength(1);
    expect(raw.documents[0]).toMatchObject({ title: "Lettera importante", titleCustom: true });
    expect(JSON.stringify(raw.documents[0].content)).toContain("Altre parole aggiunte");

    await page.getByRole("button", { name: "Esporta" }).click();
    await expect(page.getByLabel("Nome del file")).toHaveValue("Lettera importante");
  });

  test("LIB-H4 rinominare con un nome vuoto non è possibile", async ({ page }) => {
    await seedThree(page);
    await openList(page);
    await act(page, "Rinomina", "Primo").click();
    await dialog(page).getByLabel("Nuovo nome").fill("   ");
    await expect(dialog(page).getByRole("button", { name: "Salva il nome" })).toBeDisabled();
  });

  test("LIB-H5 duplicare crea una copia con lo stesso testo e un nome diverso", async ({ page }) => {
    await seedThree(page);
    await openList(page);
    await act(page, "Duplica", "Primo").click();
    await expect(item(page, "Primo (copia)")).toBeVisible();
    await expect(dialog(page).getByRole("listitem").filter({ hasText: "Primo (copia)" }).first()).toContainText("lettera al condominio");
    await act(page, "Duplica", "Primo").click();
    await expect(item(page, "Primo (copia) 2")).toBeVisible();
    const raw = await readRawDatabase(page);
    expect(raw.documents).toHaveLength(5);
    expect(new Set(raw.documents.map((d) => d.id)).size).toBe(5);
  });

  test("LIB-H6 riaprendo l'app si ritrova l'ultimo documento aperto", async ({ page }) => {
    await seedThree(page); // «Terzo» è il più recente
    const updatedAtOfA = (await readRawDatabase(page)).documents.find((d) => d.id === "a")?.updatedAt;
    await openList(page);
    await item(page, "Primo").click();
    await expect(editor(page)).toContainText("lettera al condominio");
    // aprire non cambia la data di modifica, ma ricorda l'ultima apertura
    await expect.poll(async () => (await readRawDatabase(page)).documents.find((d) => d.id === "a")?.openedAt).toBeGreaterThan(Date.now() - 60_000);
    // la data di modifica non cambia aprendo
    expect((await readRawDatabase(page)).documents.find((d) => d.id === "a")?.updatedAt).toBe(updatedAtOfA);
    await page.reload();
    await expect(editor(page)).toContainText("lettera al condominio");
  });

  test("LIB-H7 prima di aprirne un altro si salva quello aperto", async ({ page }) => {
    await seedThree(page);
    await editor(page).click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" appena scritto");
    await openList(page); // si apre subito, senza aspettare il salvataggio automatico
    await item(page, "Primo").click();
    await expect(editor(page)).toContainText("lettera al condominio");
    const raw = await readRawDatabase(page);
    expect(JSON.stringify(raw.documents.find((d) => d.id === "c")?.content)).toContain("appena scritto");
  });
});

test.describe("Ricerca", () => {
  test("LIB-S1 cerca nel testo e nel titolo, senza badare a maiuscole e accenti, e mostra dove sta la parola", async ({ page }) => {
    await seedThree(page);
    await openList(page);
    const box = dialog(page).getByLabel("Cerca nei documenti");

    await box.fill("GAMMA");
    await expect(item(page, "Terzo")).toBeVisible();
    await expect(dialog(page).getByRole("listitem")).toHaveCount(1);
    await expect(dialog(page).locator("mark")).toHaveText("gamma");

    await box.fill("perche"); // il testo ha «perché»
    await expect(item(page, "Secondo")).toBeVisible();
    await expect(dialog(page).locator("mark")).toHaveText("perché");

    await box.fill("secondo serve"); // una parola nel titolo e una nel testo
    await expect(dialog(page).getByRole("listitem")).toHaveCount(1);
    await expect(item(page, "Secondo")).toBeVisible();
  });

  test("LIB-S2 nessun risultato: lo dice; svuotando la ricerca tornano tutti", async ({ page }) => {
    await seedThree(page);
    await openList(page);
    const box = dialog(page).getByLabel("Cerca nei documenti");
    await box.fill("parolachenonce");
    await expect(dialog(page)).toContainText("Nessun documento contiene «parolachenonce».");
    await box.fill("");
    await expect(dialog(page).getByRole("listitem")).toHaveCount(3);
  });
});

test.describe("Cestino", () => {
  test("LIB-T1 elimina con conferma: «Annulla» lascia tutto, poi finisce nel cestino per 30 giorni e si ripristina", async ({ page }) => {
    await seedThree(page);
    await openList(page);

    await act(page, "Elimina", "Primo").click();
    await expect(dialog(page)).toContainText("Spostare «Primo» nel cestino?");
    await dialog(page).getByRole("button", { name: "Annulla" }).click();
    await expect(item(page, "Primo")).toBeVisible();

    await act(page, "Elimina", "Primo").click();
    await dialog(page).getByRole("button", { name: "Sposta nel cestino" }).click();
    await expect(item(page, "Primo")).toHaveCount(0);
    await expect(dialog(page).getByRole("button", { name: "Cestino (1)" })).toBeVisible();
    // non è stato cancellato: è ancora nel database, con la data di eliminazione
    const raw = await readRawDatabase(page);
    expect(raw.documents.find((d) => d.id === "a")?.deletedAt).toBeGreaterThan(Date.now() - 60_000);

    await dialog(page).getByRole("button", { name: "Cestino (1)" }).click();
    await expect(dialog(page)).toContainText("Ancora 30 giorni");
    await act(page, "Ripristina", "Primo").click();
    await expect(dialog(page)).toContainText("Il cestino è vuoto.");
    await dialog(page).getByRole("button", { name: "Torna ai documenti" }).click();
    await expect(item(page, "Primo")).toBeVisible();
    expect((await readRawDatabase(page)).documents.find((d) => d.id === "a")).not.toHaveProperty("deletedAt");
  });

  test("LIB-T2 elimina per sempre: chiede conferma e poi il documento sparisce dal database", async ({ page }) => {
    await seedThree(page);
    await openList(page);
    await act(page, "Elimina", "Secondo").click();
    await dialog(page).getByRole("button", { name: "Sposta nel cestino" }).click();
    await dialog(page).getByRole("button", { name: "Cestino (1)" }).click();

    await act(page, "Elimina per sempre", "Secondo").click();
    await expect(dialog(page)).toContainText("Eliminare per sempre «Secondo»? Non si può annullare.");
    await dialog(page).getByRole("button", { name: "Annulla" }).click();
    await expect(act(page, "Ripristina", "Secondo")).toBeVisible();

    await act(page, "Elimina per sempre", "Secondo").click();
    await dialog(page).getByRole("group", { name: "Elimina per sempre" }).getByRole("button", { name: "Elimina per sempre" }).click();
    await expect(dialog(page)).toContainText("Il cestino è vuoto.");
    expect((await readRawDatabase(page)).documents.map((d) => d.id).sort()).toEqual(["a", "c"]);
  });

  test("LIB-T3 eliminando il documento aperto si passa all'ultimo rimasto", async ({ page }) => {
    await seedThree(page); // aperto: «Terzo»
    await openList(page);
    await act(page, "Elimina", "Terzo").click();
    await dialog(page).getByRole("button", { name: "Sposta nel cestino" }).click();
    await page.keyboard.press("Escape");
    await expect(editor(page)).toContainText("verbale della riunione"); // «Secondo», il più recente rimasto
    await page.reload();
    await expect(editor(page)).toContainText("verbale della riunione"); // e non torna «Terzo»
  });

  test("LIB-T4 eliminando l'unico documento si apre un foglio vuoto", async ({ page }) => {
    await page.goto("/");
    await say(page, "unico documento punto");
    await saved(page);
    await openList(page);
    await act(page, "Elimina", "Unico documento").click();
    await dialog(page).getByRole("button", { name: "Sposta nel cestino" }).click();
    await page.keyboard.press("Escape");
    await expect(editor(page)).toHaveText("");
    await page.reload();
    await expect(editor(page)).toHaveText("");
  });

  test("LIB-T5 il cestino si svuota da solo dopo 30 giorni, ma non prima", async ({ page }) => {
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    const now = Date.now();
    await putDocuments(page, [
      makeDoc("vecchio", "Scaduto", "da cancellare", now - 40 * DAY, { deletedAt: now - 31 * DAY }),
      makeDoc("limite", "Quasi scaduto", "ancora un giorno", now - 40 * DAY, { deletedAt: now - 29 * DAY - 60_000 }),
      makeDoc("recente", "Recente", "tenuto", now - 40 * DAY, { deletedAt: now - 10 * DAY }),
    ]);
    await page.reload();
    await openList(page);
    await dialog(page).getByRole("button", { name: "Cestino (2)" }).click();
    await expect(act(page, "Ripristina", "Scaduto")).toHaveCount(0);
    await expect(dialog(page)).toContainText("Ancora 1 giorno");
    await expect(dialog(page)).toContainText("Ancora 20 giorni");
    expect((await readRawDatabase(page)).documents.map((d) => d.id).sort()).toEqual(["limite", "recente"]);
  });

  test("LIB-T6 i documenti nel cestino non compaiono nell'elenco, nella ricerca né all'avvio", async ({ page }) => {
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    const now = Date.now();
    await putDocuments(page, [
      makeDoc("v", "Visibile", "testo visibile", now - 5000),
      makeDoc("g", "Gettato", "testo gettato zzz", now, { deletedAt: now }), // il più recente, ma nel cestino
    ]);
    await page.reload();
    await expect(editor(page)).toContainText("testo visibile"); // all'avvio non si apre quello nel cestino
    await openList(page);
    await expect(item(page, "Gettato")).toHaveCount(0);
    await dialog(page).getByLabel("Cerca nei documenti").fill("zzz");
    await expect(dialog(page)).toContainText("Nessun documento contiene «zzz».");
  });
});

test.describe("Limiti e copia di sicurezza", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => makeDoc(`d${i}`, `Doc ${i}`, `testo ${i}`, 1_700_000_000_000 + i));

  test("LIB-L1 con 200 documenti non se ne fanno altri (nuovo e duplica), con un avviso chiaro", async ({ page }) => {
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    await putDocuments(page, many(200));
    await page.reload();
    await openList(page);
    await dialog(page).getByRole("button", { name: "Nuovo documento" }).click();
    await expect(dialog(page).getByRole("alert")).toContainText("Hai già 200 documenti, il massimo.");
    await act(page, "Duplica", "Doc 5").click();
    await expect(dialog(page).getByRole("alert")).toContainText("Hai già 200 documenti");
    expect((await readRawDatabase(page)).documents).toHaveLength(200);
  });

  test("LIB-L2 200 documenti: la copia di sicurezza si scarica e si può rileggere; il cestino non c'entra", async ({ page }) => {
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    await putDocuments(page, [...many(200), makeDoc("cestino", "Gettato", "x", 1, { deletedAt: 5 })]);
    await page.reload();
    await page.getByRole("button", { name: "Impostazioni" }).click();
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Scarica la copia di sicurezza" }).click()]);
    const file = JSON.parse(fs.readFileSync((await dl.path())!, "utf8"));
    expect(file.documents).toHaveLength(200);
    expect(file.documents.some((d: { id: string }) => d.id === "cestino")).toBe(false);
  });

  test("LIB-L3 201 documenti (messi da fuori): nessun file inutilizzabile, ma un avviso che spiega cosa fare", async ({ page }) => {
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    await putDocuments(page, many(201));
    await page.reload();
    await page.getByRole("button", { name: "Impostazioni" }).click();
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.getByRole("button", { name: "Scarica la copia di sicurezza" }).click();
    await expect(page.getByText(/Hai più di 200 documenti: una copia di sicurezza non può contenerli tutti/)).toBeVisible();
    expect(downloaded).toBe(false);
  });

  test("LIB-L4 documenti che pesano più di 20 MB: avviso, nessun file", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "stessa prova del computer");
    test.setTimeout(90_000);
    await page.goto("/");
    await expect(editor(page)).toBeVisible();
    // un documento pesante ma «vecchio» (non viene aperto nell'editor) e uno piccolo recente
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("elodict");
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction("documents", "readwrite");
            const big = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(21 * 1024 * 1024) }] }] };
            tx.objectStore("documents").put({ id: "pesante", title: "Pesante", content: big, language: "it", createdAt: 1, updatedAt: 1 });
            tx.objectStore("documents").put({ id: "leggero", title: "Leggero", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ciao" }] }] }, language: "it", createdAt: 2, updatedAt: 2 });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await expect(editor(page)).toContainText("ciao");
    await page.getByRole("button", { name: "Impostazioni" }).click();
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    await page.getByRole("button", { name: "Scarica la copia di sicurezza" }).click();
    await expect(page.getByText(/I documenti pesano più di 20 MB/)).toBeVisible({ timeout: 30_000 });
    expect(downloaded).toBe(false);
  });
});

test.describe("Accessibilità", () => {
  test("LIB-A1 l'elenco, la ricerca, le conferme e il cestino non hanno errori di accessibilità", async ({ page }) => {
    await seedThree(page);
    await openList(page);
    await dialog(page).getByLabel("Cerca nei documenti").fill("gamma");
    expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
    await dialog(page).getByLabel("Cerca nei documenti").fill("");
    await act(page, "Elimina", "Primo").click();
    expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
    await dialog(page).getByRole("button", { name: "Sposta nel cestino" }).click();
    await dialog(page).getByRole("button", { name: "Cestino (1)" }).click();
    await act(page, "Elimina per sempre", "Primo").click();
    expect((await new AxeBuilder({ page }).include("dialog[open]").analyze()).violations).toEqual([]);
  });

  test("LIB-A2 nelle altre lingue i testi dell'elenco ci sono (nessuna chiave mancante)", async ({ page }) => {
    await seedThree(page);
    for (const [flag, title, button] of [
      ["English", "Your documents", "New document"],
      ["Français", "Vos documents", "Nouveau document"],
      ["Español", "Tus documentos", "Documento nuevo"],
    ] as const) {
      await page.getByRole("banner").getByRole("button", { name: flag }).click();
      await page.getByRole("banner").getByRole("button", { name: /^(Documents|Documentos)$/ }).click();
      await expect(page.getByRole("dialog", { name: title })).toBeVisible();
      await expect(page.getByRole("dialog", { name: title }).getByRole("button", { name: button })).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});
