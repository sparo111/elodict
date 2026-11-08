// Decide che cosa mostrare a chi vuole installare l'app, in base al dispositivo.
// Funzione pura: non legge nulla da sola, riceve tutto in ingresso (così si prova con qualsiasi dispositivo finto).

export type InstallCase =
  | "installed"   // già installata: niente da mostrare
  | "prompt"      // Chrome/Edge su computer e Android: un clic installa
  | "ios"         // iPhone/iPad con Safari: 3 passi a mano
  | "ios-other"   // Chrome/Firefox/Edge su iPhone/iPad: non possono installare, serve Safari
  | "safari-mac"  // Safari su Mac: «Aggiungi al Dock» dal menu File
  | "firefox"     // Firefox: non installa; si può mettere tra i preferiti
  | "menu";       // altri (Chrome/Edge senza invito pronto): dal menu del programma

export interface InstallEnv {
  userAgent: string;
  maxTouchPoints?: number;
  /** l'app è già aperta come app installata */
  standalone: boolean;
  /** il programma ha già offerto l'installazione con un clic (evento beforeinstallprompt) */
  hasPrompt: boolean;
}

export function isIOS(userAgent: string, maxTouchPoints = 0): boolean {
  // Da iPadOS 13 l'iPad si presenta come un Mac: lo si riconosce dallo schermo a tocco.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export function detectInstallCase(env: InstallEnv): InstallCase {
  if (env.standalone) return "installed";
  const ua = env.userAgent;
  if (isIOS(ua, env.maxTouchPoints)) {
    // Su iPhone e iPad anche Chrome, Firefox ed Edge usano il motore di Safari ma non possono installare
    return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? "ios-other" : "ios";
  }
  if (env.hasPrompt) return "prompt";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return "safari-mac";
  return "menu";
}

/** Legge dal dispositivo vero i dati che servono a detectInstallCase. */
export function readInstallEnv(hasPrompt: boolean, installed: boolean): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  const standalone =
    installed || nav.standalone === true || (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches);
  return { userAgent: nav.userAgent, maxTouchPoints: nav.maxTouchPoints, standalone, hasPrompt };
}
