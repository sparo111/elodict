// Stato dell'installazione, fuori da React: l'invito del programma («beforeinstallprompt») può arrivare
// prima che la pagina sia pronta, quindi si ascolta fin dall'avvio (main.tsx chiama startInstallCapture).
import { useSyncExternalStore } from "react";
import { detectInstallCase, readInstallEnv, type InstallCase } from "./detect";

/** L'invito di installazione offerto da Chrome/Edge. Non è nei tipi standard di TypeScript. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface State {
  prompt: InstallPromptEvent | null;
  installed: boolean;
  dialogOpen: boolean;
  bannerDismissed: boolean;
}

const DISMISS_KEY = "elodict-install-banner";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "dismissed";
  } catch (e) {
    console.warn("memoria locale non disponibile", e);
    return false;
  }
}

let state: State = { prompt: null, installed: false, dialogOpen: false, bannerDismissed: false };
const listeners = new Set<() => void>();
let started = false;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function startInstallCapture() {
  if (started || typeof window === "undefined") return;
  started = true;
  state = { ...state, bannerDismissed: readDismissed() };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // l'invito si usa con il nostro pulsante, non con quello del programma
    set({ prompt: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => set({ prompt: null, installed: true, dialogOpen: false }));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => state;

export function useInstallState(): State & { installCase: InstallCase } {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { ...s, installCase: detectInstallCase(readInstallEnv(s.prompt !== null, s.installed)) };
}

/** Un clic: se il programma lo permette installa subito, altrimenti apre le istruzioni. */
export async function startInstall(): Promise<void> {
  const p = state.prompt;
  if (!p) {
    set({ dialogOpen: true });
    return;
  }
  set({ prompt: null });
  try {
    await p.prompt();
    const choice = await p.userChoice;
    if (choice.outcome === "accepted") set({ installed: true });
  } catch (e) {
    console.warn("installazione non riuscita, mostro le istruzioni", e);
    set({ dialogOpen: true });
  }
}

export const closeInstallDialog = () => set({ dialogOpen: false });
export const openInstallDialog = () => set({ dialogOpen: true });

export function dismissInstallBanner() {
  set({ bannerDismissed: true });
  try {
    localStorage.setItem(DISMISS_KEY, "dismissed");
  } catch (e) {
    console.warn("non riesco a ricordare la scelta", e);
  }
}
