import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCustomer360, useDemoEvent, useIntelligence, usePlans, useProject, useScenario } from "../../shared/api/hooks";
import { isLiveLlm, money, phoneDigits, telHref, whatsappHref } from "../../shared/ui/format";
import { ProductIcon, SparkIcon } from "../../shared/ui/icons";
import { TwinChart } from "../../shared/ui/TwinChart";
import { apiPost } from "../../shared/api/client";
import { z } from "zod";

export function TwinPage() {
  const [params] = useSearchParams();
  const id = params.get("id") || "new-parent";
  const navigate = useNavigate();
  const intelQ = useIntelligence(id);
  const c360 = useCustomer360(id);
  const scenarioQ = useScenario(id);
  const project = useProject();
  const plans = usePlans();
  const demoEvent = useDemoEvent();
  const [selected, setSelected] = useState<Set<number>>(new Set([0]));
  const [briefOpen, setBriefOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [goalFallback, setGoalFallback] = useState<any>(null);

  useEffect(() => {
    setSelected(new Set([0]));
    setGoalFallback(null);
  }, [id]);

  useEffect(() => {
    if (scenarioQ.isError) {
      apiPost(`/api/customers/${id}/goal-plan`, z.any(), {}).then((res) => setGoalFallback(res.data));
    }
  }, [id, scenarioQ.isError]);

  const intel = intelQ.data;
  const persona = intel?.persona || {};
  const event = intel?.event || scenarioQ.data?.scenario.event || {};
  const products = (intel?.products || []).map((x: any, index: number) => ({
    name: x.name,
    type: x.type,
    fit: x.fit,
    value: x.annualValue ? `${money.format(x.annualValue)}/yr` : "No fee",
    color: ["blue", "teal", "gold"][index] || "blue",
    why: intel?.ai?.productNarratives?.[x.name] || x.reason,
    impact: x.impact,
    action: Number(x.monthlyImpact) || 0,
  }));

  const projection = scenarioQ.data?.projection || (goalFallback
    ? { ignored: goalFallback.ignored, accepted: goalFallback.modeled, delta: goalFallback.delta }
    : null);

  const actions = [...selected].map((i) => products[i]).filter(Boolean).map((p) => ({
    name: p.name,
    label: p.name,
    monthlyImpact: p.action,
    startsMonth: 1,
  }));

  useEffect(() => {
    if (!id) return;
    project.mutate({ scenarioId: id, actions });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, selected, products.length]);

  const sim = project.data || projection;
  const ignored = sim?.ignored;
  const modeled = sim?.modeled || sim?.accepted;
  const delta = sim?.delta?.endingBalance || 0;
  const modeledVals = modeled?.trajectory?.map((p: any) => p.projectedBalance) || [];
  const low = modeledVals.length ? Math.min(...modeledVals) : 0;
  const engaged = (plans.data || []).some((row) => row.customerId === id);
  const name = persona.fullName || "Customer";
  const initials = persona.initials || name.slice(0, 2).toUpperCase();
  const phone = persona.phone || "";

  const evidence = event.evidence || [];

  return (
    <div className="app-view active">
      {!engaged && (
        <section className="empty-invite card">
          <div>
            <p className="eyebrow">NOT YET EXPLORED</p>
            <h3>{name.split(" ")[0]} hasn't explored their own Future You yet.</h3>
          </div>
          <Link className="primary-button" to={`/future?scenario=${id}`}>
            <span className="btn-icon"><SparkIcon /></span> Open Future You
          </Link>
        </section>
      )}
      <button className="back-link" type="button" onClick={() => navigate("/today")}>Back to Today</button>

      <section className="client-top card">
        <div className="client-top-main">
          <div className="profile-hero">
            <div className="profile-avatar">{initials}</div>
            <div>
              <div className="title-row"><h2>{name}</h2><span className="tier">{(persona.segment || "Priority").toUpperCase()}</span></div>
              <p>{persona.age} years · {persona.occupation || persona.employer}</p>
              <div className="contact-actions">
                {phoneDigits(phone) ? (
                  <>
                    <a className="contact-btn call" href={telHref(phone)}>Call</a>
                    <a className="contact-btn whatsapp" href={whatsappHref(phone)} target="_blank" rel="noreferrer">WhatsApp</a>
                  </>
                ) : null}
              </div>
            </div>
          </div>
          <div className="client-event-chip">
            <span className="eyebrow">LIFE EVENT</span>
            <strong>{event.label || "—"}</strong>
            <span className="confidence">{event.confidence != null ? `${Math.round(event.confidence * 100)}%` : "—"}</span>
          </div>
        </div>
      </section>

      <section className="detect-strip card">
        <div className="detect-strip-head">
          <div>
            <p className="eyebrow">EARLY BEHAVIOUR DETECTION</p>
            <h2>Detected changes</h2>
          </div>
          <div className="detect-strip-actions">
            <span className="explainable"><i></i> {isLiveLlm(intel?.source) ? "LIVE" : "VERIFIED FALLBACK"}</span>
            <button className="link-button" type="button" onClick={() => setEvidenceOpen(true)}>Evidence <span>↗</span></button>
          </div>
        </div>
        <div className="detected-changes">
          {evidence.slice(0, 3).map((row: any) => (
            <div className="detected-chip" key={row.label}>
              <em>{Math.round((row.confidence || 0) * 100)}%</em>
              <strong>{row.label}</strong>
              <small>{row.value}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-client">
        <article className="simulator card twin-hero">
          <div className="card-head">
            <div>
              <p className="eyebrow">DIGITAL TWIN</p>
              <h2>Ignored vs supported path</h2>
            </div>
            <span className="live-badge"><i></i> LIVE</span>
          </div>
          <div className="twin-body">
            <div className="sim-summary">
              <div>
                <span>Projected 12-month uplift</span>
                <strong>{money.format(delta)}</strong>
              </div>
            </div>
            <TwinChart ignored={ignored} modeled={modeled} fillId="twinFill" />
            <div className="impact-grid">
              <div><span>LOWEST BALANCE</span><strong>{money.format(low)}</strong></div>
              <div><span>RISK WINDOW</span><strong>{ignored?.overdraftMonth && !modeled?.overdraftMonth ? "Protected" : ignored?.overdraftMonth ? "Elevated" : "Watch"}</strong></div>
            </div>
          </div>
          <div className="twin-foot">
            <button className="primary-button" type="button" onClick={() => { setBriefOpen(true); demoEvent.mutate("brief"); }}>
              <span className="btn-icon"><SparkIcon /></span> Generate meeting brief
            </button>
          </div>
        </article>
        <aside className="client-rail">
          <article className="recommendations card">
            <div className="card-head"><div><p className="eyebrow">NEXT BEST CONVERSATION</p><h2>Recommended support</h2></div></div>
            <div className="product-list">
              {products.map((p: any, i: number) => (
                <button key={p.name} className={`product ${selected.has(i) ? "selected" : ""}`} type="button" onClick={() => {
                  const next = new Set(selected);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  setSelected(next);
                }}>
                  <span className="check">✓</span>
                  <span className={`product-icon ${p.color}`}><ProductIcon type={p.type} /></span>
                  <span className="product-copy">
                    <small className="product-type">{p.type}</small>
                    <strong>{p.name}</strong>
                    <span className="impact">{p.impact}</span>
                    <span className="why"><b>Why this fits</b>{p.why}</span>
                  </span>
                  <span className="product-meta"><b>{p.fit}%</b><strong>{p.value}</strong></span>
                </button>
              ))}
            </div>
          </article>
          <details className="client-details card snapshot-card" open>
            <summary>Client snapshot</summary>
            <div className="c360-strip">
              <div><span>IDENTITY</span><strong>{c360.data?.identity?.idMasked || "—"}</strong></div>
              <div><span>BUREAU</span><strong>{c360.data?.credit?.scoreBand || "—"}</strong></div>
              <div><span>HOLDINGS</span><strong>{(c360.data?.holdings || []).length}</strong></div>
            </div>
          </details>
        </aside>
      </section>

      {briefOpen && (
        <dialog open className="evidence-dialog" onClose={() => setBriefOpen(false)}>
          <div className="dialog-head"><div><p className="eyebrow">AI-ASSISTED PREPARATION</p><h2>Your meeting brief is ready</h2></div><button type="button" onClick={() => setBriefOpen(false)}>×</button></div>
          <div>
            <p>{intel?.ai?.executiveSummary || "Needs-led brief from detected event and eligible support."}</p>
            <p className="compliance-note">Generated via {intel?.source}. Confirm circumstances before presenting any product.</p>
          </div>
        </dialog>
      )}
      {evidenceOpen && (
        <dialog open className="evidence-dialog" onClose={() => setEvidenceOpen(false)}>
          <div className="dialog-head"><div><p className="eyebrow">AUDITABLE INSIGHT</p><h2>How this insight was derived</h2></div><button type="button" onClick={() => setEvidenceOpen(false)}>×</button></div>
          <div>
            {(event.evidence || []).map((e: any) => (
              <div className="evidence-row" key={e.label}>
                <span><b>{e.label}</b><small>{e.source}</small></span>
                <strong>{e.value}</strong>
                <em>{Math.round((e.confidence || 0) * 100)}%</em>
              </div>
            ))}
          </div>
        </dialog>
      )}
    </div>
  );
}
