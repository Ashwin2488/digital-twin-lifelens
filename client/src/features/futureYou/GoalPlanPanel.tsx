import { FormEvent, useEffect, useState } from "react";
import { apiPost } from "../../shared/api/client";
import { unknownRecord } from "../../shared/api/schemas";
import { useExperience, useLeverSuggest, useSharePlan } from "../../shared/api/hooks";
import { money } from "../../shared/ui/format";
import { TwinChart } from "../../shared/ui/TwinChart";
import { SparkIcon } from "../../shared/ui/icons";

type Goal = { type: string; targetAmount: number; targetDate: string };
type Levers = { spendCutPct: number; extraMonthly: number; lumpSum: number };
type ChatMsg = { role: "user" | "twin" | "thinking"; text: string };

export function GoalPlanPanel({
  customerId,
  setCustomerId,
  customers,
  intent,
  setIntent,
  onToast,
  onCoins,
}: {
  customerId: string;
  setCustomerId: (id: string) => void;
  customers: { id: string; scenarioId: string | null; fullName: string; eventLabel: string | null }[];
  intent: string;
  setIntent: (text: string) => void;
  onToast: (text: string) => void;
  onCoins: (delta: number) => void;
}) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [levers, setLevers] = useState<Levers>({ spendCutPct: 0, extraMonthly: 0, lumpSum: 0 });
  const [plan, setPlan] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [branch, setBranch] = useState<"ignored" | "accepted">("ignored");
  const [question, setQuestion] = useState("");
  const [earned, setEarned] = useState<string[]>([]);
  const sharePlan = useSharePlan();
  const leverSuggest = useLeverSuggest(customerId);
  const chrome = useExperience().data?.chrome;
  const first = customers.find((c) => c.id === customerId || c.scenarioId === customerId)?.fullName.split(" ")[0] || "You";

  useEffect(() => {
    if (!goal && chrome?.defaultGoal) setGoal(chrome.defaultGoal);
  }, [chrome, goal]);

  useEffect(() => {
    if (!goal) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      apiPost(`/api/customers/${customerId}/goal-plan`, unknownRecord, { goal, levers }).then((res) => {
        if (cancelled) return;
        setPlan(res.data);
        let gained = 0;
        const nextEarned = [...earned];
        for (const row of res.data.achievements || []) {
          if (row.earned && !nextEarned.includes(row.id)) {
            nextEarned.push(row.id);
            gained += 40;
          }
        }
        if (gained) {
          setEarned(nextEarned);
          onCoins(gained);
          onToast(`+${gained} coins · projection milestone`);
        }
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, goal, levers]);

  async function submitIntent(e: FormEvent) {
    e.preventDefault();
    if (!intent.trim()) return;
    const res = await apiPost(`/api/customers/${customerId}/intent`, unknownRecord, { text: intent, levers });
    setPlan(res.data.plan);
    if (res.data.goal) setGoal((g) => ({ ...(g || { type: "savings", targetAmount: 0, targetDate: "" }), ...res.data.goal }));
  }

  async function ask(text: string) {
    setMessages((m) => [...m, { role: "user", text }, { role: "thinking", text: "Working through the numbers…" }]);
    const res = await apiPost("/api/future-you", unknownRecord, {
      question: text,
      scenarioId: customerId,
      branch,
      sessionId: "demo",
      usePlan: true,
      goal,
      levers,
      userIntent: intent,
    });
    setMessages((m) => [
      ...m.filter((x) => x.role !== "thinking"),
      { role: "twin", text: res.data.answer || res.data.text || "Here’s how that future looks." },
    ]);
  }

  const mood = plan?.mood;

  return (
    <div className="experience-panel active">
      <section className="twin-talk card">
        <p className="eyebrow">TALK TO YOUR TWIN</p>
        <h2>Tell it what you’re becoming</h2>
        <form className="intent-form" onSubmit={submitIntent}>
          <textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={3} placeholder="I am going to be a parent…" />
          <div className="intent-chips">
            { (chrome?.intentChips || []).map((sample: string) => (
              <button key={sample} type="button" onClick={() => setIntent(sample)}>{sample}</button>
            ))}
          </div>
          <button className="primary-button" type="submit">Show me that future</button>
        </form>
        <section className="future-chat goal-chat">
          <div className="chat-thread">
            {!messages.length && (
              <div className="chat-empty">
                <p><strong>Future {first}</strong> is ready.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role === "user" ? "user" : "twin"} ${m.role === "thinking" ? "thinking" : ""}`}>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); if (question.trim()) { ask(question); setQuestion(""); } }}>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a follow-up…" />
            <button className="primary-button" type="submit">Ask</button>
          </form>
        </section>
        <div className="branch-toggle">
          <button type="button" className={`branch-btn ${branch === "ignored" ? "active" : ""}`} onClick={() => setBranch("ignored")}>Without my moves</button>
          <button type="button" className={`branch-btn ${branch === "accepted" ? "active" : ""}`} onClick={() => setBranch("accepted")}>With my moves</button>
        </div>
      </section>

      <section className="goal-plan card">
        <div className="goal-plan-head">
          <div>
            <p className="eyebrow">DIGITAL TWIN · ANY CUSTOMER</p>
            <h2>Set a goal. Drag a lever. Watch the path move.</h2>
          </div>
          <div>
            <label className="lab-label">Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.filter((c) => c.scenarioId).map((c) => (
                  <option key={c.id} value={c.scenarioId || c.id}>{c.fullName}{c.eventLabel ? ` · ${c.eventLabel}` : ""}</option>
                ))}
                {(chrome?.extraGoalCustomers || []).map((row: { id: string; label: string }) => (
                  <option key={row.id} value={row.id}>{row.label}</option>
                ))}
              </select>
            </label>
            <button className="secondary-button" type="button" onClick={() => {
              sharePlan.mutate({
                customerId,
                label: intent ? `${plan?.cashflow?.label || customerId} · ${intent.slice(0, 80)}` : plan?.cashflow?.label || customerId,
                userIntent: intent,
                goal: plan?.goal,
                onTrack: plan?.onTrack,
                endingBalance: plan?.modeled?.endingBalance,
              });
              onToast("Plan queued for Jamie");
            }}>Share plan with RM</button>
          </div>
        </div>
        <div className="goal-plan-grid">
          <form className="goal-controls" onSubmit={(e) => e.preventDefault()}>
            {goal && (
              <>
            <label className="lab-label">Goal type
              <select value={goal.type} onChange={(e) => setGoal({ ...goal, type: e.target.value })}>
                <option value="emergency">Emergency buffer</option>
                <option value="home">Home deposit</option>
                <option value="wedding">Wedding / event</option>
                <option value="savings">General savings</option>
              </select>
            </label>
            <label className="lab-label">Target amount (SGD)
              <input type="number" min={1000} step={500} value={goal.targetAmount} onChange={(e) => setGoal({ ...goal, targetAmount: Number(e.target.value) })} />
            </label>
            <label className="lab-label">Target date
              <input type="date" value={goal.targetDate} onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })} />
            </label>
            <label className="lab-label">Discretionary spend cut <b>{levers.spendCutPct}%</b>
              <input type="range" min={0} max={40} value={levers.spendCutPct} onChange={(e) => setLevers({ ...levers, spendCutPct: Number(e.target.value) })} />
            </label>
            <label className="lab-label">Extra monthly save <b>{money.format(levers.extraMonthly)}</b>
              <input type="range" min={0} max={2000} step={50} value={levers.extraMonthly} onChange={(e) => setLevers({ ...levers, extraMonthly: Number(e.target.value) })} />
            </label>
            <label className="lab-label">{plan?.lumpSumLabel || "One-off lump sum"} <b>{money.format(levers.lumpSum)}</b>
              <input type="range" min={0} max={20000} step={500} value={levers.lumpSum} onChange={(e) => setLevers({ ...levers, lumpSum: Number(e.target.value) })} />
            </label>
              </>
            )}
          </form>
          <div>
            {plan && (
              <>
                <div className="goal-stats">
                  <div><span>REQUIRED / MO</span><strong>{money.format(plan.requiredMonthly || 0)}</strong></div>
                  <div><span>MODELED NET</span><strong>{money.format(plan.monthlyNet || 0)}</strong></div>
                  <div><span>ENDING CASH</span><strong>{money.format(plan.modeled?.endingBalance || 0)}</strong></div>
                  <div><span>STATUS</span><strong>{plan.onTrack ? "On track" : "Short"}</strong></div>
                </div>
                {mood && (
                  <div className={`goal-mood mood-${mood.key}`}>
                    <span>{mood.key === "calm" ? "🙂" : mood.key === "stressed" ? "😟" : "😐"}</span>
                    <span>{mood.label} — {mood.detail}</span>
                  </div>
                )}
                <TwinChart ignored={plan.ignored} modeled={plan.modeled} fillId="goalFill" />
                <p className="twin-lede">{plan.copy || "Same deterministic engine as the RM chart."}</p>
                {plan.copySource && plan.copySource !== "deterministic" && <p className="cite-chip">Narration: {plan.copySource}</p>}
                <div className="achievement-grid">
                  {(plan.achievements || []).map((row: any) => (
                    <div key={row.id} className={row.earned ? "earned" : ""}>
                      <b>{row.earned ? "✓" : "○"}</b>
                      <strong>{row.title}</strong>
                      <small>{row.detail}</small>
                    </div>
                  ))}
                </div>
                <div className="lever-suggest">
                  <button className="secondary-button" type="button" onClick={() => leverSuggest.mutate({ goal, levers })}>
                    <span className="btn-icon"><SparkIcon /></span> Suggest ways to improve this
                  </button>
                  <div className="lever-candidates">
                    {leverSuggest.isPending && <p className="lab-empty">Thinking…</p>}
                    {(leverSuggest.data?.candidates || []).map((c: any, i: number) => (
                      <div key={i} className={`lever-candidate ${c.mood?.key === "stressed" ? "is-stressed" : ""}`}>
                        <strong>{c.label}</strong>
                        <small>{c.why}</small>
                        <div className="candidate-foot">
                          <em>{c.onTrack ? "On track" : "Short"} · {money.format(c.endingBalance)} ending</em>
                          <button type="button" onClick={() => { setLevers(c.levers); onToast("Levers applied"); }}>Apply</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
