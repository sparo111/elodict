import { useEffect, useState } from "react";
import type { Strings } from "../i18n";
import type { EngineKind } from "../speech/engine";
import type { Lang } from "../commands/types";
import { ATTRIBUTION } from "../attribution";
import { deleteModels, isModelReady, isOfflineSupported, prepareModel, WHISPER_MODELS, type WhisperModelId } from "../speech/whisper";
import { deleteParakeet, isParakeetReady, prepareParakeet } from "../speech/parakeetEngine";

interface Props {
  s: Strings;
  engine: EngineKind;
  model: WhisperModelId;
  onEngine: (e: EngineKind) => void;
  onModel: (m: WhisperModelId) => void;
  /** lingua dell'interfaccia: serve ai crediti di Parakeet */
  uiLang: Lang;
}

/** Scelta di chi ascolta: il browser (veloce, serve internet) o il modello offline (l'audio resta qui). */
export function OfflineSection({ s, engine, model, onEngine, onModel, uiLang }: Props) {
  const [pct, setPct] = useState<number | null>(null);
  const [whisperReady, setWhisperReady] = useState(() => isModelReady(model));
  const [parakeetReady, setParakeetReady] = useState(() => isParakeetReady());
  const isParakeet = engine === "parakeet";
  const ready = isParakeet ? parakeetReady : whisperReady;
  const [note, setNote] = useState<"failed" | "deleted" | null>(null);
  const offlineOk = isOfflineSupported();

  useEffect(() => setWhisperReady(isModelReady(model)), [model]);

  const download = async () => {
    setNote(null);
    setPct(0);
    try {
      if (isParakeet) {
        await prepareParakeet(setPct);
        setParakeetReady(true);
      } else {
        await prepareModel(model, setPct);
        setWhisperReady(true);
      }
    } catch {
      setNote("failed");
    } finally {
      setPct(null);
    }
  };

  const remove = async () => {
    // «Elimina i modelli scaricati» toglie tutti i modelli: Whisper e Parakeet
    await Promise.all([deleteModels(), deleteParakeet()]);
    setWhisperReady(false);
    setParakeetReady(false);
    setNote("deleted");
  };

  const radio = "h-5 w-5 shrink-0 accent-[var(--color-accent)]";

  return (
    <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
      <legend className="mb-1 text-sm font-semibold">{s.engineTitle}</legend>

      <label className="flex items-start gap-3 text-sm">
        <input type="radio" name="engine" className={`${radio} mt-0.5`} checked={engine === "browser"} onChange={() => onEngine("browser")} />
        <span>{s.engineBrowser}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="radio"
          name="engine"
          className={`${radio} mt-0.5`}
          checked={engine === "offline"}
          disabled={!offlineOk}
          onChange={() => onEngine("offline")}
        />
        <span>{s.engineOffline}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="radio"
          name="engine"
          className={`${radio} mt-0.5`}
          checked={engine === "parakeet"}
          disabled={!offlineOk}
          aria-describedby="engine-parakeet-note"
          onChange={() => onEngine("parakeet")}
        />
        <span>
          {s.engineParakeet}
          <span id="engine-parakeet-note" className="mt-0.5 block text-muted">{s.engineParakeetNote}</span>
        </span>
      </label>
      {!offlineOk && <p className="text-sm text-warning">{s.unsupportedOfflineBody}</p>}

      <p className="text-sm text-muted">{s.engineHelp}</p>

      {!isParakeet && (
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {s.modelLabel}
        <select
          className="h-10 w-full rounded-md border border-border-input bg-bg px-3 text-base"
          value={model}
          onChange={(e) => onModel(e.target.value as WhisperModelId)}
        >
          {(Object.keys(WHISPER_MODELS) as WhisperModelId[]).map((m) => (
            <option key={m} value={m}>
              {m === "tiny" ? s.modelTiny : s.modelBase}
            </option>
          ))}
        </select>
      </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void download()}
          disabled={!offlineOk || pct !== null}
          className="h-9 rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface disabled:opacity-50"
        >
          {s.modelDownload}
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={pct !== null}
          className="h-9 rounded-md border border-border-input px-3 text-sm font-semibold hover:bg-surface disabled:opacity-50"
        >
          {s.modelDelete}
        </button>
      </div>

      {pct !== null && (
        <div className="flex flex-col gap-1" role="status">
          <progress className="h-2 w-full" max={100} value={pct} aria-label={s.modelDownloading.replace("{pct}", String(pct))} />
          <p className="text-sm">{s.modelDownloading.replace("{pct}", String(pct))}</p>
        </div>
      )}
      {pct === null && note === null && (
        <p className="text-sm" role="status">{ready ? s.modelReady : s.modelNotReady}</p>
      )}
      {note === "failed" && <p role="alert" className="text-sm text-danger">{s.modelFailed}</p>}
      {note === "deleted" && <p role="status" className="text-sm">{s.modelDeleted}</p>}

      {offlineOk && (
        <section className="flex flex-col gap-1 border-t border-border pt-3 text-sm" aria-labelledby="parakeet-credits">
          <h4 id="parakeet-credits" className="font-semibold">{ATTRIBUTION[uiLang].title}</h4>
          {/* paragrafi e non un elenco <li>: nella finestra delle impostazioni le prove contano gli <li> del dizionario */}
          <div className="flex flex-col gap-1 text-muted">
            {ATTRIBUTION[uiLang].lines.map((l) => <p key={l} className="break-words">{l}</p>)}
          </div>
          <p className="text-muted">
            <a className="underline" href={ATTRIBUTION[uiLang].licenseUrl} target="_blank" rel="noopener noreferrer">{ATTRIBUTION[uiLang].license}</a>. {ATTRIBUTION[uiLang].changes}
          </p>
        </section>
      )}
    </fieldset>
  );
}
