// «Il primo avvio è già stato fatto?». Oltre che nelle impostazioni salvate (Dexie), la risposta si ricorda anche
// nella memoria locale del sito, che si legge subito: così la procedura non lampeggia per un istante
// a chi l'ha già fatta, mentre le impostazioni si stanno ancora leggendo.
const KEY = "elodict-onboarding";

export function readOnboardingMirror(): boolean {
  try {
    return localStorage.getItem(KEY) === "done";
  } catch (e) {
    console.warn("memoria locale non disponibile", e);
    return false;
  }
}

export function writeOnboardingMirror(done: boolean): void {
  try {
    if (done) localStorage.setItem(KEY, "done");
    else localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("non riesco a ricordare il primo avvio", e);
  }
}
