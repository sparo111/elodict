import { useEffect, useRef, useState } from "react";
import { Check, Download, Mic, Zap } from "lucide-react";
import { Flags } from "../components/Flags";
import type { Lang } from "../commands/types";
import type { Strings } from "../i18n";
import type { EngineKind } from "../speech/engine";
import { prepareModel, WHISPER_MODELS, type WhisperModelId } from "../speech/whisper";
import { estimateRemainingSeconds, formatEta } from "./eta";
import { requestMic, type MicResult } from "./mic";

/**
 * Modello scaricato con «Privato». Si usa il medio (circa 80 MB) e non il piccolo (circa 40 MB):
 * in italiano il piccolo ha sbagliato una parola nella prova («ditatura»), il medio nessuna.
 * Per usare il piccolo basta cambiare questa riga: il testo mostra la misura vera del modello scelto.
 */
export const ONBOARDING_MODEL: WhisperModelId = "base";

interface Props {
  open: boolean;
  s: Strings;
  lang: Lang;
  onLang: (l: Lang) => void;
  /** chiude senza cambiare le altre impostazioni */
  onSkip: () => void;
  onFinish: (choice: { engine: EngineKind; whisperModel: WhisperModelId }) => void;
  /** chiude e porta l'utente alla casella «Prova senza microfono» */
  onTryBox: () => void;
}

const big = "inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-6 text-lg font-semibold";

/** Primo avvio guidato: lingua, microfono, come ascoltare. Tre schermate, sempre saltabili. */
export function Onboarding({ open, s, lang, onLang, onSkip, onFinish, onTryBox }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(1);
  const [mic, setMic] = useState<MicResult | "asking" | null>(null);
  const [download, setDownload] = useState<{ pct: number; eta: number | null; startedAt: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setStep(1);
      setMic(null);
      setDownload(null);
      setFailed(false);
      setReady(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const askMic = async () => {
    setMic("asking");
    setMic(await requestMic());
  };

  const startDownload = async () => {
    setFailed(false);
    const startedAt = Date.now();
    setDownload({ pct: 0, eta: null, startedAt });
    try {
      await prepareModel(ONBOARDING_MODEL, (pct) =>
        setDownload({ pct, eta: estimateRemainingSeconds(Date.now() - startedAt, pct), startedAt }),
      );
      setDownload(null);
      setReady(true);
    } catch (e) {
      console.warn("download del modello non riuscito", e);
      setDownload(null);
      setFailed(true);
    }
  };

  const mb = WHISPER_MODELS[ONBOARDING_MODEL].approxMB;
  const title = step === 1 ? s.ob1Title : step === 2 ? s.ob2Title : s.ob3Title;
  const micText =
    mic === "ok" ? s.ob2Ready : mic === "denied" ? s.ob2Denied : mic === "none" ? s.ob2NoMic : mic === "error" ? s.ob2Error : null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="onboarding-title"
      onCancel={(e) => {
        e.preventDefault();
        onSkip();
      }}
      className="m-0 h-full max-h-none w-full max-w-none bg-bg p-0 text-text backdrop:bg-black/40"
    >
      {open && (
        <div className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-base text-muted" aria-live="polite">
              {s.obStep.replace("{n}", String(step)).replace("{total}", "3")}
            </p>
            <button type="button" onClick={onSkip} className="min-h-12 rounded-md px-4 text-base font-semibold text-accent underline">
              {s.obSkip}
            </button>
          </div>

          <div className="flex gap-2" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-2 flex-1 rounded-pill ${n <= step ? "bg-accent" : "bg-border"}`} />
            ))}
          </div>

          <h2 id="onboarding-title" className="text-xl">{title}</h2>

          {step === 1 && (
            <>
              <p className="text-lg">{s.what1}</p>
              <p className="text-lg">{s.ob1Body}</p>
              <Flags size="lg" value={lang} label={s.flagsLabel} onPick={onLang} />
              <button type="button" onClick={() => setStep(2)} className={`${big} bg-accent text-on-accent`}>
                {s.obNext}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-lg">{s.ob2Body}</p>
              <button
                type="button"
                onClick={() => void askMic()}
                disabled={mic === "asking" || mic === "ok"}
                className={`${big} border-2 border-accent text-accent disabled:opacity-60`}
              >
                {mic === "ok" ? <Check size={22} aria-hidden="true" /> : <Mic size={22} aria-hidden="true" />}
                {s.ob2Allow}
              </button>
              {micText && (
                <p role={mic === "ok" ? "status" : "alert"} className={`text-lg ${mic === "ok" ? "text-success" : "text-danger"}`}>
                  {micText}
                </p>
              )}
              {(mic === "denied" || mic === "none" || mic === "error") && (
                <button type="button" onClick={onTryBox} className={`${big} border-2 border-border-input`}>
                  {s.ob2TryBox}
                </button>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className={`${big} border-2 border-border-input`}>
                  {s.obBack}
                </button>
                <button type="button" onClick={() => setStep(3)} className={`${big} flex-1 bg-accent text-on-accent`}>
                  {s.obNext}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {!ready && (
                <>
                  <button
                    type="button"
                    onClick={() => void startDownload()}
                    disabled={download !== null}
                    className="flex flex-col gap-1 rounded-lg border-2 border-accent bg-accent-soft p-5 text-left disabled:opacity-80"
                  >
                    <span className="flex items-center gap-2 text-xl font-bold">
                      <Download size={22} aria-hidden="true" />
                      {s.ob3PrivateTitle}
                      <span className="rounded-pill bg-accent px-3 py-1 text-sm font-semibold text-on-accent">{s.ob3PrivateTag}</span>
                    </span>
                    <span className="text-lg">{s.ob3PrivateBody.replace("{mb}", String(mb))}</span>
                  </button>

                  {download && (
                    <div role="status" className="flex flex-col gap-2">
                      <progress
                        className="h-3 w-full"
                        max={100}
                        value={download.pct}
                        aria-label={s.ob3Downloading.replace("{pct}", String(download.pct))}
                      />
                      <p className="text-lg">{s.ob3Downloading.replace("{pct}", String(download.pct))}</p>
                      {download.eta !== null && <p className="text-base text-muted">{s.ob3Eta.replace("{t}", formatEta(download.eta, s))}</p>}
                    </div>
                  )}
                  {failed && (
                    <div role="alert" className="flex flex-col gap-3">
                      <p className="text-lg text-danger">{s.ob3Failed}</p>
                      <button type="button" onClick={() => void startDownload()} className={`${big} border-2 border-accent text-accent`}>
                        {s.ob3Retry}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onFinish({ engine: "browser", whisperModel: ONBOARDING_MODEL })}
                    disabled={download !== null}
                    className="flex flex-col gap-1 rounded-lg border-2 border-border p-5 text-left hover:bg-surface disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 text-xl font-bold">
                      <Zap size={22} aria-hidden="true" />
                      {s.ob3FastTitle}
                    </span>
                    <span className="text-lg">{s.ob3FastBody}</span>
                  </button>
                  <button type="button" onClick={() => setStep(2)} disabled={download !== null} className={`${big} border-2 border-border-input disabled:opacity-60`}>
                    {s.obBack}
                  </button>
                </>
              )}

              {ready && (
                <>
                  <p role="status" className="flex items-center gap-2 text-xl font-bold text-success">
                    <Check size={24} aria-hidden="true" />
                    {s.ob3Done}
                  </p>
                  <button
                    type="button"
                    onClick={() => onFinish({ engine: "offline", whisperModel: ONBOARDING_MODEL })}
                    className={`${big} bg-accent text-on-accent`}
                  >
                    {s.obFinish}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </dialog>
  );
}
