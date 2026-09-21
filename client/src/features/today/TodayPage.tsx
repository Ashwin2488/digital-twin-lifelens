import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomers, useExperience, usePlans, useTodayTriage } from "../../shared/api/hooks";
import { compactSgd, money } from "../../shared/ui/format";
import { SparkIcon } from "../../shared/ui/icons";
import { TwinChart, miniSpark } from "../../shared/ui/TwinChart";
import { apiGet, apiPost } from "../../shared/api/client";
import { projectionSchema, scenarioDetailSchema } from "../../shared/api/schemas";
import { z } from "zod";
import { useQueries } from "@tanstack/react-query";

function twinVerdict(projection: z.infer<typeof projectionSchema>) {
  const ignored = projection.ignored;
  if (ignored.overdraftMonth) return `Stress in month ${ignored.overdraftMonth} if ignored`;
  if ((ignored.minBalance || 0) < (ignored.startingBalance || 0) * 0.35) return "Buffer thins sharply if unmanaged";
  return `Accepted path +${money.format(projection.delta.endingBalance)} ending balance`;
}

export function TodayPage() {
  const navigate = useNavigate();
  const triage = useTodayTriage();
  const customers = useCustomers({ limit: 1 });
  const plans = usePlans();
  const experience = useExperience();
  const [previewId, setPreviewId] = useState<string | null>(null);

  const cardQueries = useQueries({
    queries: (triage.data || []).map((row) => ({
      queryKey: ["today-card", row.id],
      queryFn: async () => {
        try {
          const data = (await apiGet(`/api/scenarios/${row.id}`, scenarioDetailSchema)).data;
          return { id: row.id, row, scenario: data.scenario, projection: data.projection };
        } catch {
          const plan = (await apiPost(`/api/customers/${row.id}/goal-plan`, z.any(), {})).data as {
            ignored: z.infer<typeof projectionSchema>["ignored"];
            modeled: z.infer<typeof projectionSchema>["ignored"];
            delta: z.infer<typeof projectionSchema>["delta"];
          };
          return {
            id: row.id,
            row,
            scenario: { id: row.id, event: row.event },
            projection: { ignored: plan.ignored, accepted: plan.modeled, delta: plan.delta },
          };
        }
      },
      enabled: Boolean(triage.data),
    })),
  });

  const cards = cardQueries.map((q) => q.data).filter(Boolean) as Array<{
    id: string;
    row: NonNullable<typeof triage.data>[number];
    scenario: { event: { label: string; confidence?: number } };
    projection: z.infer<typeof projectionSchema>;
  }>;

  const activeId = previewId || cards[0]?.id;
  const active = cards.find((c) => c.id === activeId);
  const reviewDue = customers.data?.counts.reviewDue ?? 0;
  const lifeEvents = customers.data?.counts.lifeEvents ?? 0;
  const portfolio = customers.data?.portfolioSize;
  const opportunity = cards.reduce((sum, c) => sum + (Number(c.projection?.delta?.endingBalance) || 0), 0);

  const spark = useMemo(() => {
    const points = experience.data?.chrome?.momentumSpark;
    if (!points?.length) return "";
    const w = 88;
    const h = 28;
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    return points
      .map((v, i) => {
        const xPos = (i / (points.length - 1)) * w;
        const yPos = h - 3 - ((v - min) / range) * (h - 8);
        return `${i ? "L" : "M"}${xPos.toFixed(1)},${yPos.toFixed(1)}`;
      })
      .join(" ");
  }, [experience.data]);

  return (
    <div className="app-view active">
      <section className="portfolio-strip" aria-label="Portfolio snapshot">
        <div className="portfolio-stat">
          <span>MY PORTFOLIO</span>
          <strong>{portfolio ?? "—"}</strong>
          <small>active relationships</small>
        </div>
        <div className="portfolio-stat">
          <span>OPPORTUNITY VALUE</span>
          <strong>{compactSgd(opportunity)}</strong>
          <small className="up">↑ twin uplift if supported</small>
        </div>
        <div className="portfolio-stat">
          <span>CLIENTS TO REVIEW</span>
          <strong>{reviewDue + lifeEvents}</strong>
          <small>{cards.length} high priority</small>
        </div>
        <div className="portfolio-stat accent-stat">
          <span>RELATIONSHIP MOMENTUM</span>
          <strong>+8.2</strong>
          <small>top 10% of team</small>
          <svg className="momentum-spark" viewBox="0 0 88 28" preserveAspectRatio="none" aria-hidden="true">
            <path d={spark} />
          </svg>
        </div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">PRIORITY MOMENTS</p>
          <h2>Life events detected</h2>
        </div>
        <button className="text-button" type="button" onClick={() => navigate("/customers")}>
          View all customers <span>→</span>
        </button>
      </section>
      <section className="triage-strip" aria-label="Priority life events">
        {triage.isLoading && <p className="book-empty">Loading twin projections…</p>}
        {triage.isError && <p className="book-empty">Could not load twin impact.</p>}
        {cards.map((card) => {
          const conf = Math.round((card.scenario.event.confidence || card.row.event.confidence) * 100);
          const name = card.row.persona.fullName || card.id;
          const initials = card.row.persona.initials || name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
          return (
            <button
              key={card.id}
              type="button"
              className={`triage-card ${card.id === activeId ? "active" : ""}`}
              onClick={() => setPreviewId(card.id)}
              onDoubleClick={() => navigate(`/client?id=${card.id}`)}
            >
              <div className="triage-card-head">
                <span className="tab-avatar">{initials}</span>
                <span className="triage-card-copy">
                  <strong>{name}</strong>
                  <small>{card.scenario.event.label}</small>
                </span>
                <span className="confidence">{conf}%</span>
              </div>
              <div className="triage-spark" dangerouslySetInnerHTML={{ __html: miniSpark(card.projection.ignored, card.projection.accepted || card.projection.modeled, `triageFill-${card.id}`) }} />
              <p className="twin-verdict">{twinVerdict(card.projection)}</p>
              <span className="triage-cta">Rank {card.row.score} · view outlook <span aria-hidden="true">→</span></span>
            </button>
          );
        })}
      </section>

      <section className="home-outlook card" aria-label="Twin outlook preview">
        <div className="card-head">
          <div>
            <p className="eyebrow">DIGITAL TWIN PREVIEW</p>
            <h2>{active ? `${active.row.persona.fullName || active.id} · projected liquidity` : "Projected liquidity"}</h2>
          </div>
          <span className="live-badge"><i></i> LIVE</span>
        </div>
        <p className="twin-lede">
          {active ? `${active.scenario.event.label} — ignored vs supported path over the next 12 months.` : "Select a priority customer to preview the ignored vs supported path."}
        </p>
        {active && (
          <div className="home-outlook-grid">
            <div className="home-outlook-chart">
              <div className="chart-head">
                <strong>Next 12 months</strong>
                <div className="legend">
                  <span><i className="base-dot"></i>Ignored path</span>
                  <span><i className="solution-dot"></i>With support</span>
                </div>
              </div>
              <TwinChart ignored={active.projection.ignored} modeled={active.projection.accepted || active.projection.modeled} fillId="homeFill" />
            </div>
            <div className="home-outlook-side">
              <div className="home-outlook-metrics">
                <div><span>12-MONTH UPLIFT</span><strong>{money.format(active.projection.delta.endingBalance)}</strong></div>
                <div>
                  <span>LOWEST BALANCE</span>
                  <strong>{money.format(Math.min(...(active.projection.accepted || active.projection.modeled || active.projection.ignored).trajectory.map((p) => p.projectedBalance)))}</strong>
                </div>
                <div><span>RISK WINDOW</span><strong>{active.projection.ignored.overdraftMonth ? `Elevated · M${active.projection.ignored.overdraftMonth}` : "Protected"}</strong></div>
              </div>
              <Link className="primary-button" to={`/client?id=${active.id}`}>
                <span className="btn-icon" aria-hidden="true"><SparkIcon /></span> Open full twin
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="handoff-board card" aria-label="Consented customer shares">
        <div className="card-head"><div><p className="eyebrow">CONSENTED HANDOFF</p><h2>Plans shared with Jamie</h2></div></div>
        <div>
          {!plans.data?.length && <p className="book-empty">No consented shares yet this session.</p>}
          {plans.data?.map((plan) => (
            <div className="log-row" key={plan.id}>
              <span>
                <b>{plan.label}</b> {plan.onTrack ? "on track" : ""}
              </span>
              <small>{new Date(plan.receivedAt).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
