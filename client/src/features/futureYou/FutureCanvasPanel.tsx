import { DragEvent, useState } from "react";
import { money } from "../../shared/ui/format";
import { useExperience } from "../../shared/api/hooks";
import { addCanvasEvent, canvasForecast, type CanvasCatalog, type PlacedEvent } from "./canvasEngine";
import { HumanCharacter } from "./HumanAvatar";

export function FutureCanvasPanel({
  firstName,
  tags,
  aum,
  look,
  events,
  setEvents,
  connections,
  setConnections,
  filter,
  setFilter,
  onToast,
}: {
  firstName: string;
  tags: string[];
  aum: number;
  look: { colour?: string; equipped?: string[] };
  events: PlacedEvent[];
  setEvents: (events: PlacedEvent[]) => void;
  connections: string[];
  setConnections: (next: string[]) => void;
  filter: string;
  setFilter: (filter: string) => void;
  onToast: (text: string) => void;
}) {
  const experience = useExperience();
  const catalog = experience.data?.canvas as CanvasCatalog | undefined;
  const years = experience.data?.canvas?.years || [];
  const providers = experience.data?.canvas?.providers || [];
  const healthSummary = experience.data?.canvas?.healthSummary || [];
  const categories = experience.data?.canvas?.categories || ["all"];
  const eventsCatalog = catalog?.events || [];
  const forecast = catalog ? canvasForecast(catalog, events, connections, aum) : { selected: [], upfront: 0, monthly: 0, assets: aum, stress: 0, runway: 0 };
  const ids = new Set(forecast.selected.map((e) => e.id));
  const chosen = new Set(events.map((e) => e.id));
  const list = eventsCatalog.filter((event) => filter === "all" || event.category === filter);
  const [dragOver, setDragOver] = useState<number | null>(null);

  if (!catalog) return <p className="lab-empty">Loading Future Canvas catalog…</p>;

  function place(id: string, slot?: number) {
    const result = addCanvasEvent(catalog, events, id, slot);
    setEvents(result.events);
    if (result.toast) onToast(result.toast);
  }

  return (
    <div className="experience-panel active">
      <section className="canvas-hero card">
        <div>
          <p className="eyebrow">FUTURE CANVAS · PERSONALISED FOR {firstName.toUpperCase()}</p>
          <h2>Design the life you are planning for.</h2>
          <p>Drag possible life events onto the timeline and see how the picture—and the numbers—change together.</p>
        </div>
        <div className="canvas-profile-tags">{tags.map((t) => <span key={t}>{t}</span>)}</div>
      </section>
      <div className="canvas-layout">
        <aside className="event-palette card">
          <div className="palette-head">
            <div><p className="eyebrow">SUGGESTED FOR YOU</p><h3>Possible life events</h3></div>
            <span>Based on life stage</span>
          </div>
          <p className="palette-copy">Drag an event to a year—or click it to add it to the next available year.</p>
          <div className="event-category-filter">
            {categories.map((cat: string) => (
              <button key={cat} type="button" className={filter === cat ? "active" : ""} onClick={() => setFilter(cat)}>{cat === "all" ? "All" : cat[0].toUpperCase() + cat.slice(1)}</button>
            ))}
          </div>
          <div className="event-palette-list">
            {list.map((event) => (
              <button
                key={event.id}
                type="button"
                className={`event-drag-card ${chosen.has(event.id) ? "used" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", event.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => place(event.id)}
              >
                <b>{event.icon}</b>
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.recommended ? "Recommended for your life stage" : "Explore this possibility"}</small>
                </span>
                <em>{event.monthly >= 0 ? "+" : ""}{money.format(event.monthly)}/mo</em>
                <i>⋮⋮</i>
              </button>
            ))}
          </div>
        </aside>

        <main className="future-canvas card">
          <div className="canvas-toolbar">
            <div><p className="eyebrow">YOUR NEXT 10 YEARS</p><h3>Drop events onto the timeline</h3></div>
            <button type="button" onClick={() => { setEvents([]); onToast("Future canvas cleared"); }}>Clear canvas</button>
          </div>
          <div className="drop-timeline">
            {years.map((label: string, slot: number) => (
              <div
                key={label}
                className={`year-drop-zone ${events.some((e) => e.slot === slot) ? "has-events" : ""} ${dragOver === slot ? "drag-over" : ""}`}
                onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(slot); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e: DragEvent) => {
                  e.preventDefault();
                  setDragOver(null);
                  place(e.dataTransfer.getData("text/plain"), slot);
                }}
              >
                <span>{label}</span>
                <div>
                  {events.filter((e) => e.slot === slot).map((placed) => {
                    const event = eventsCatalog.find((x) => x.id === placed.id);
                    if (!event) return null;
                    return (
                      <button key={event.id} type="button" className="placed-event" onClick={() => setEvents(events.filter((x) => x.id !== event.id))}>
                        <b>{event.icon}</b><small>{event.title}</small><i>×</i>
                      </button>
                    );
                  })}
                  {!events.some((e) => e.slot === slot) && <small>Drop an event here</small>}
                </div>
              </div>
            ))}
          </div>
          <div className={`future-world ${forecast.selected.reduce((sum, e) => sum + e.stress, 0) > 22 ? "world-busy" : ""}`}>
            <div className="world-sky"><i></i><span className="world-cloud one"></span><span className="world-cloud two"></span></div>
            <div className="world-ground"></div>
            <div className={`world-house ${ids.has("home") ? "visible" : ""}`}><span></span></div>
            <div className={`world-car ${ids.has("car") ? "visible" : ""}`}>▰</div>
            <div className={`world-family ${ids.has("second-child") || ids.has("eldercare") ? "visible" : ""}`}><span>●</span><span>●</span><i>●</i></div>
            <div className={`world-ring ${ids.has("wedding") ? "visible" : ""}`}>◇</div>
            <div className="world-tree">♧</div>
            <div className="world-avatar"><HumanCharacter look={look} /></div>
            <p>{forecast.selected.at(-1)?.caption || `Add a life event to begin building ${firstName}'s future.`}</p>
          </div>
          <div className="canvas-forecast">
            <div><span>UPFRONT FUNDING</span><strong>{money.format(forecast.upfront)}</strong><small>{forecast.selected.length ? `${forecast.selected.length} planned event${forecast.selected.length === 1 ? "" : "s"}` : "No events added"}</small></div>
            <div><span>MONTHLY CASHFLOW CHANGE</span><strong className={forecast.monthly < 0 ? "negative" : ""}>{forecast.monthly >= 0 ? "+" : ""}{money.format(forecast.monthly)}</strong><small>once all events begin</small></div>
            <div><span>PROJECTED ASSETS</span><strong>{money.format(forecast.assets)}</strong><small>illustrative 10-year position</small></div>
            <div><span>RESILIENCE WINDOW</span><strong>{forecast.runway > catalog.assumptions.runwayCap ? `${catalog.assumptions.runwayCap}+ mo` : `${forecast.runway} mo`}</strong><small>before safeguards</small></div>
            <div><span>WELLBEING PRESSURE</span><strong>{forecast.stress}/100</strong><small>{connections.length ? "informed by connected context" : "estimated from event load"}</small></div>
          </div>
        </main>

        <aside className="connected-life card">
          <div>
            <p className="eyebrow">CONNECTED LIFE</p>
            <h3>Add wellbeing context</h3>
            <p>Connect health and activity data to make future assumptions more personal.</p>
          </div>
          <div className="connection-list">
            {providers.map((p: { id: string; title: string; copy: string; icon: string; glyph: string }) => {
              const active = connections.includes(p.id);
              return (
                <button key={p.id} type="button" className={active ? "connected" : ""} onClick={() => {
                  const next = active ? connections.filter((x) => x !== p.id) : [...connections, p.id];
                  setConnections(next);
                  onToast(`${p.id} ${next.includes(p.id) ? "connected with consent" : "disconnected"}`);
                }}>
                  <span className={`provider-icon ${p.icon}`}>{p.glyph}</span>
                  <span><strong>{p.title}</strong><small>{p.copy}</small></span>
                  <b>{active ? "Connected ✓" : "Connect"}</b>
                </button>
              );
            })}
          </div>
          <div className="health-insight">
            {connections.length ? (
              <>
                <span>WELLBEING CONTEXT ACTIVE</span>
                <div className="health-mini-grid">
                  {healthSummary.map((row: { value: string; label: string }) => (
                    <div key={row.label}><strong>{row.value}</strong><small>{row.label}</small></div>
                  ))}
                </div>
                <p>Simulated summary from {connections.join(", ")}. Used only to personalise wellbeing assumptions.</p>
              </>
            ) : (
              <>
                <span>NO DATA CONNECTED</span>
                <p>Connecting is optional. Health data adds wellbeing context; it never changes credit eligibility or suitability rules.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
