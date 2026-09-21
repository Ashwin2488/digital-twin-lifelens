import { useEffect, useState } from "react";
import { useDemoLog, useDemoMetrics, useDemoReset, useExperience, useHealth, useHoldoutEval } from "../../shared/api/hooks";
import { apiGet, apiPost } from "../../shared/api/client";
import { unknownRecord } from "../../shared/api/schemas";

function parseAdhoc(text: string, sample: unknown) {
  const trimmed = text.trim();
  if (!trimmed) return sample;
  try {
    return JSON.parse(trimmed);
  } catch {
    return { csv: trimmed };
  }
}

export function DeveloperPage() {
  const health = useHealth();
  const evalQ = useHoldoutEval();
  const log = useDemoLog();
  const metrics = useDemoMetrics();
  const reset = useDemoReset();
  const chrome = useExperience().data?.chrome;
  const sample = chrome?.weddingSample;
  const [adhoc, setAdhoc] = useState("");
  const [adhocResult, setAdhocResult] = useState<any>(null);
  const [compareId, setCompareId] = useState("");
  const [compare, setCompare] = useState<any>(null);

  useEffect(() => {
    if (sample && !adhoc) setAdhoc(JSON.stringify(sample, null, 2));
  }, [sample, adhoc]);

  useEffect(() => {
    if (!compareId && chrome?.defaultCustomerId) setCompareId(chrome.defaultCustomerId);
  }, [chrome, compareId]);

  return (
    <div className="app-view active">
      <section className="view-intro card">
        <p className="eyebrow">DEVELOPER</p>
        <h2>How this actually works</h2>
        <p>Diagnostics for judges and engineers. Nothing here is shown to an RM's daily workflow.</p>
      </section>

      <section className="system-status card">
        <div className="card-head"><div><p className="eyebrow">SYSTEM STATUS</p><h2>Is this live or fallback?</h2></div></div>
        <div className="status-grid">
          {health.data && (
            <>
              <div><span>AI CONNECTED</span><strong className={health.data.aiConnected ? "status-live" : "status-off"}>{health.data.aiConnected ? "Live" : "Fallback"}</strong></div>
              <div><span>DETECTION LLM</span><strong>{health.data.detectLlmOn ? "On" : "Off"}</strong></div>
              <div><span>PROVIDER</span><strong>{health.data.provider || "—"}</strong></div>
              <div><span>MODEL</span><strong>{health.data.model || "—"}</strong></div>
            </>
          )}
        </div>
      </section>

      <section className="business-proof card">
        <div>
          <p className="eyebrow">DETECTOR · UNSEEN CUSTOMERS</p>
          <h3>{evalQ.data ? `${Math.round(evalQ.data.precision * 100)}% precision on unseen ledgers.` : "Measuring life-event detection on 24 holdout ledgers."}</h3>
        </div>
        <div><span>PRECISION</span><strong>{evalQ.data ? `${Math.round(evalQ.data.precision * 100)}%` : "—"}</strong></div>
        <div><span>RECALL</span><strong>{evalQ.data ? `${Math.round(evalQ.data.recall * 100)}%` : "—"}</strong></div>
        <div><span>HOLDOUT SIZE</span><strong>{evalQ.data?.size ?? "—"}</strong></div>
        <div><span>QUEUED HANDOFFS</span><strong>{metrics.data?.queuedPlans ?? 0}</strong></div>
      </section>

      <details className="detector-lab card" open>
        <summary className="lab-summary"><strong>Live paste-your-own-ledger + legacy vs generalized compare</strong></summary>
        <div className="lab-grid">
          <div>
            <p className="eyebrow">LIVE PASTE · NO PERSONA</p>
            <textarea rows={8} value={adhoc} onChange={(e) => setAdhoc(e.target.value)} />
            <div className="lab-actions">
              <button className="secondary-button" type="button" disabled={!sample} onClick={() => setAdhoc(JSON.stringify(sample, null, 2))}>Load wedding sample</button>
              <button className="primary-button" type="button" onClick={async () => {
                const res = await apiPost("/api/detect/adhoc", unknownRecord, parseAdhoc(adhoc, sample));
                setAdhocResult(res.data);
              }}>Run detection</button>
            </div>
            <div className="lab-result">
              {adhocResult?.primary && (
                <div className="lab-hit">
                  <h3>{adhocResult.primary.label}</h3>
                  <small>{Math.round(adhocResult.primary.confidence * 100)}% · not persisted</small>
                </div>
              )}
              {adhocResult?.empty && <p className="lab-empty">{adhocResult.message}</p>}
            </div>
          </div>
          <div>
            <p className="eyebrow">BEFORE / AFTER</p>
            <select value={compareId} onChange={(e) => setCompareId(e.target.value)}>
              {(chrome?.compareCustomers || []).map((row: { id: string; label: string }) => (
                <option key={row.id} value={row.id}>{row.label}</option>
              ))}
            </select>
            <div className="lab-actions">
              <button className="primary-button" type="button" onClick={async () => {
                const res = await apiGet(`/api/detect/legacy-vs-generalized/${compareId}`, unknownRecord);
                setCompare(res.data);
              }}>Compare detectors</button>
              <button className="text-button" type="button" onClick={() => reset.mutate()}>Reset demo state</button>
            </div>
            {compare && (
              <div className="compare-cols">
                <article className="compare-col"><span>LEGACY</span><strong>{compare.legacy?.label}</strong><small>{Math.round((compare.legacy?.confidence || 0) * 100)}%</small></article>
                <article className="compare-col"><span>GENERALIZED</span><strong>{compare.generalized?.label}</strong><small>{Math.round((compare.generalized?.confidence || 0) * 100)}%</small></article>
              </div>
            )}
          </div>
        </div>
      </details>

      <section className="session-log card">
        <div className="card-head"><div><p className="eyebrow">SESSION ACTIVITY</p><h2>What's happened this process</h2></div></div>
        <div>
          {!log.data?.length && <p className="lab-empty">No activity yet this process.</p>}
          {log.data?.map((row, i) => (
            <div className="log-row" key={`${row.at}-${i}`}>
              <span><b>{row.type}</b> {row.detail}</span>
              <small>{new Date(row.at).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
