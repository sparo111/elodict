import { afterEach, describe, expect, it, vi } from "vitest";
import { detectInstallCase, isIOS, readInstallEnv, type InstallEnv } from "./detect";

const UA = {
  chromeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  edgeWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  firefoxWin: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
  firefoxAndroid: "Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  safariIpad: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  // da iPadOS 13 in poi l'iPad si presenta come un Mac
  safariIpadAsMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  chromeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1",
  firefoxIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15",
  edgeIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/130.0.0.0 Version/17.0 Mobile/15E148 Safari/604.1",
  chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

const env = (userAgent: string, over: Partial<InstallEnv> = {}): InstallEnv => ({
  userAgent,
  maxTouchPoints: 0,
  standalone: false,
  hasPrompt: false,
  ...over,
});

describe("detectInstallCase", () => {
  it("già installata: niente da mostrare, qualunque sia il dispositivo", () => {
    for (const ua of Object.values(UA)) expect(detectInstallCase(env(ua, { standalone: true, hasPrompt: true }))).toBe("installed");
  });

  it("Chrome/Edge con l'invito pronto (computer e Android): un clic", () => {
    expect(detectInstallCase(env(UA.chromeWin, { hasPrompt: true }))).toBe("prompt");
    expect(detectInstallCase(env(UA.edgeWin, { hasPrompt: true }))).toBe("prompt");
    expect(detectInstallCase(env(UA.chromeAndroid, { hasPrompt: true }))).toBe("prompt");
    expect(detectInstallCase(env(UA.chromeMac, { hasPrompt: true }))).toBe("prompt");
  });

  it("Chrome/Edge senza invito pronto: istruzioni dal menu", () => {
    expect(detectInstallCase(env(UA.chromeWin))).toBe("menu");
    expect(detectInstallCase(env(UA.edgeWin))).toBe("menu");
    expect(detectInstallCase(env(UA.chromeAndroid))).toBe("menu");
  });

  it("iPhone e iPad con Safari: i 3 passi", () => {
    expect(detectInstallCase(env(UA.safariIphone, { maxTouchPoints: 5 }))).toBe("ios");
    expect(detectInstallCase(env(UA.safariIpad, { maxTouchPoints: 5 }))).toBe("ios");
  });

  it("iPad che si presenta come Mac (schermo a tocco): è un iPad", () => {
    expect(detectInstallCase(env(UA.safariIpadAsMac, { maxTouchPoints: 5 }))).toBe("ios");
  });

  it("Mac vero con Safari: Aggiungi al Dock", () => {
    expect(detectInstallCase(env(UA.safariMac, { maxTouchPoints: 0 }))).toBe("safari-mac");
  });

  it("Chrome, Firefox ed Edge su iPhone non possono installare: serve Safari", () => {
    expect(detectInstallCase(env(UA.chromeIphone, { maxTouchPoints: 5 }))).toBe("ios-other");
    expect(detectInstallCase(env(UA.firefoxIphone, { maxTouchPoints: 5 }))).toBe("ios-other");
    expect(detectInstallCase(env(UA.edgeIphone, { maxTouchPoints: 5 }))).toBe("ios-other");
  });

  it("Firefox non può installare, né su computer né su Android", () => {
    expect(detectInstallCase(env(UA.firefoxWin))).toBe("firefox");
    expect(detectInstallCase(env(UA.firefoxAndroid))).toBe("firefox");
  });

  it("l'invito pronto vince su tutto tranne iPhone/iPad e «già installata»", () => {
    expect(detectInstallCase(env(UA.firefoxWin, { hasPrompt: true }))).toBe("prompt");
    expect(detectInstallCase(env(UA.safariIphone, { maxTouchPoints: 5, hasPrompt: true }))).toBe("ios");
  });

  it("uno strumento sconosciuto: istruzioni dal menu, mai un errore", () => {
    expect(detectInstallCase(env(""))).toBe("menu");
    expect(detectInstallCase(env("qualcosa di strano/1.0"))).toBe("menu");
  });
});

describe("isIOS", () => {
  it("riconosce iPhone, iPad e iPod", () => {
    expect(isIOS(UA.safariIphone)).toBe(true);
    expect(isIOS(UA.safariIpad)).toBe(true);
    expect(isIOS("Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)")).toBe(true);
  });
  it("un Mac senza schermo a tocco non è un iPad; con schermo a tocco sì", () => {
    expect(isIOS(UA.safariMac, 0)).toBe(false);
    expect(isIOS(UA.safariMac, 5)).toBe(true);
  });
  it("Windows e Android no", () => {
    expect(isIOS(UA.chromeWin, 10)).toBe(false);
    expect(isIOS(UA.chromeAndroid, 5)).toBe(false);
  });
});

describe("readInstallEnv (dal dispositivo vero)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const device = (nav: Record<string, unknown>, standaloneMedia?: boolean) => {
    vi.stubGlobal("navigator", { userAgent: "UA-prova", maxTouchPoints: 5, ...nav });
    if (standaloneMedia === undefined) vi.stubGlobal("matchMedia", undefined);
    else vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("standalone") && standaloneMedia }));
  };

  it("riporta il programma, lo schermo a tocco e l'invito ricevuto", () => {
    device({}, false);
    expect(readInstallEnv(true, false)).toEqual({ userAgent: "UA-prova", maxTouchPoints: 5, standalone: false, hasPrompt: true });
  });

  it("è «già installata» se lo dice l'evento di installazione", () => {
    device({}, false);
    expect(readInstallEnv(false, true).standalone).toBe(true);
  });

  it("è «già installata» se è aperta come app (display-mode standalone)", () => {
    device({}, true);
    expect(readInstallEnv(false, false).standalone).toBe(true);
  });

  it("è «già installata» su iPhone se Safari la apre dalla schermata Home (navigator.standalone)", () => {
    device({ standalone: true }, false);
    expect(readInstallEnv(false, false).standalone).toBe(true);
  });

  it("senza matchMedia non si rompe: non installata", () => {
    device({});
    expect(readInstallEnv(false, false).standalone).toBe(false);
  });
});
