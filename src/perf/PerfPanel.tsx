// Riquadro dei tempi, frase per frase, mentre si detta (T013b). Esiste solo nelle build di prova, con ?perf=1.
import { useSyncExternalStore } from "react";
import { clearPerfRows, getPerfRows, perfConfig, subscribePerf } from "./perf";

const f = (n: number) => Math.round(n).toString();

export default function PerfPanel() {
  const rows = useSyncExternalStore(subscribePerf, getPerfRows);
  const cfg = perfConfig();
  const mean = (k: "totalMs" | "silenceMs" | "encoderMs" | "decoderMs") => (rows.length ? rows.reduce((s, r) => s + r[k], 0) / rows.length : 0);
  return (
    <aside
      aria-label="Tempi del riconoscimento (prova)"
      data-testid="perf-panel"
      style={{ position: "fixed", right: 8, top: 56, zIndex: 60, pointerEvents: "none", maxWidth: "min(96vw, 820px)", maxHeight: "40vh", overflow: "auto", background: "rgba(255,255,255,.96)", color: "#111", border: "1px solid #888", borderRadius: 8, padding: 8, fontSize: 12 }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <b>Tempi (ms)</b>
        <span>pausa {cfg.silenceMs} · thread {cfg.threads} · {cfg.device}</span>
        <button type="button" onClick={clearPerfRows} style={{ marginLeft: "auto", border: "1px solid #888", borderRadius: 4, padding: "0 6px", pointerEvents: "auto" }}>
          Azzera
        </button>
      </div>
      <table style={{ borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            {["#", "audio", "attesa pausa", "prepar.", "coda", "log-mel", "encoder", "generaz.", "passi", "ritorno", "schermo", "TOTALE", "testo"].map((h) => (
              <th key={h} style={{ border: "1px solid #bbb", padding: "1px 4px", textAlign: "left" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.n}>
              {[r.n, f(r.audioMs), f(r.silenceMs), f(r.prepMs), f(r.queueMs), f(r.featureMs), f(r.encoderMs), f(r.decoderMs), r.decoderSteps, f(r.returnMs), f(r.screenMs), f(r.totalMs)].map((v, i) => (
                <td key={i} style={{ border: "1px solid #ccc", padding: "1px 4px", fontWeight: i === 11 ? 700 : 400 }}>
                  {v}
                </td>
              ))}
              <td style={{ border: "1px solid #ccc", padding: "1px 4px", whiteSpace: "normal", minWidth: 160 }}>{r.text}</td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr>
              <td colSpan={2}>medie</td>
              <td>{f(mean("silenceMs"))}</td>
              <td colSpan={3} />
              <td>{f(mean("encoderMs"))}</td>
              <td>{f(mean("decoderMs"))}</td>
              <td colSpan={2} />
              <td />
              <td>
                <b>{f(mean("totalMs"))}</b>
              </td>
              <td />
            </tr>
          )}
        </tbody>
      </table>
    </aside>
  );
}
