// Impostazioni dell'app: lettura all'avvio, modifica e salvataggio sul dispositivo.
import { useCallback, useRef, useState } from "react";
import { readOnboardingMirror, writeOnboardingMirror } from "../onboarding/state";
import { defaultLang, loadSettings, saveSettings, type SettingsRow } from "../store/db";

export type Prefs = Omit<SettingsRow, "id">;

const initialPrefs = (): Prefs => ({
  dictationLanguage: defaultLang(),
  uiLanguage: defaultLang(),
  cleanFillers: true,
  cleanRepeats: false,
  autoPeriod: false,
  engine: "browser",
  whisperModel: "base",
  dictionary: [],
  onboardingDone: readOnboardingMirror(),
});

export function useSettings() {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  /** vero quando le impostazioni salvate sono state lette e applicate */
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  /** scelte fatte prima che le impostazioni salvate fossero lette: vincono sulle salvate (BUG-005) */
  const pending = useRef<Partial<Prefs>>({});
  /** sempre l'ultimo valore: due scelte di fila nello stesso istante si sommano */
  const current = useRef(prefs);

  const apply = useCallback((p: Partial<Prefs>) => {
    current.current = { ...current.current, ...p };
    setPrefs(current.current);
  }, []);

  /** Rilegge le impostazioni salvate. Se l'utente ha già scelto qualcosa prima, la sua scelta vince e il resto non si tocca. */
  const load = useCallback(async () => {
    const settings = await loadSettings();
    const chosen = pending.current;
    pending.current = {};
    const merged: SettingsRow = { ...settings, ...chosen };
    // «Primo avvio fatto» se lo dice la memoria locale (si legge subito) oppure le impostazioni salvate.
    merged.onboardingDone = merged.onboardingDone || readOnboardingMirror();
    writeOnboardingMirror(merged.onboardingDone);
    const { id: _id, ...values } = merged;
    apply(values);
    loaded.current = true;
    setReady(true);
    if (Object.keys(chosen).length || merged.onboardingDone !== settings.onboardingDone) void saveSettings(merged);
  }, [apply]);

  /** Cambia una o più impostazioni e le salva sul dispositivo. */
  const save = useCallback(
    (over: Partial<Prefs>) => {
      if (!loaded.current) {
        pending.current = { ...pending.current, ...over };
        apply(over);
        return;
      }
      apply(over);
      void saveSettings({ id: "main", ...current.current });
    },
    [apply],
  );

  /** Primo avvio: chiuderlo (anche saltandolo) lo segna come fatto; da Impostazioni si può rifare. */
  const finishOnboarding = useCallback(
    (choice?: Pick<Prefs, "engine" | "whisperModel">) => {
      writeOnboardingMirror(true);
      save({ onboardingDone: true, ...choice });
    },
    [save],
  );
  const redoOnboarding = useCallback(() => {
    writeOnboardingMirror(false);
    save({ onboardingDone: false });
  }, [save]);

  return { prefs, ready, load, save, finishOnboarding, redoOnboarding };
}
