import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomers } from "../../shared/api/hooks";
import { money, phoneDigits, telHref, whatsappHref } from "../../shared/ui/format";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "life-event", label: "Life events" },
  { id: "review", label: "Review due" },
  { id: "Priority", label: "Priority" },
];

export function CustomersPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const query = useMemo(() => {
    const params: Record<string, string | number> = { limit: 200, q };
    if (filter === "life-event" || filter === "review") params.status = filter;
    if (filter === "Priority") params.segment = "Priority";
    return params;
  }, [q, filter]);
  const book = useCustomers(query);

  const list = book.data?.customers || [];
  const counts = book.data?.counts;
  const size = book.data?.portfolioSize ?? 0;

  return (
    <div className="app-view active">
      <section className="view-intro card">
        <p className="eyebrow">MY PORTFOLIO</p>
        <h2>All customers</h2>
        <p>Browse your book, then open clients with detected life events into the digital twin.</p>
      </section>
      <div className="book-toolbar">
        <label className="book-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search name, phone, segment, or life event…" autoComplete="off" />
        </label>
        <div className="book-filters" role="group" aria-label="Filter customers">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" className={`book-filter ${filter === item.id ? "active" : ""}`} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="book-meta">
        <span><strong>{size}</strong> active relationships</span>
        <span><strong>{counts?.lifeEvents ?? "—"}</strong> life events</span>
        <span><strong>{counts?.reviewDue ?? "—"}</strong> review due</span>
        <span>Showing <strong>{book.data?.meta?.total ?? list.length}</strong></span>
      </div>
      <div className="customer-book page-book">
        {book.isLoading && <p className="book-empty">Loading book…</p>}
        {book.isError && <p className="book-empty">Could not load customers.</p>}
        {!book.isLoading && !list.length && <p className="book-empty">No customers match this search.</p>}
        {list.map((c) => {
          const interactive = Boolean(c.scenarioId);
          const contact = c.lastContactDays === 0 ? "Today" : c.lastContactDays === 1 ? "1 day ago" : `${c.lastContactDays} days ago`;
          const digits = phoneDigits(c.phone);
          return (
            <div
              key={c.id}
              className={`book-row ${interactive ? "interactive" : ""}`}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              onClick={() => {
                if (!c.scenarioId) return;
                navigate(`/client?id=${c.scenarioId}`);
              }}
            >
              <span className="book-avatar">{c.initials}</span>
              <span className="book-main">
                <strong>{c.fullName}</strong>
                <small>{c.age} · {c.occupation}{c.phone ? ` · ${c.phone}` : ""}</small>
              </span>
              <span className="book-seg">{c.segment}</span>
              <span className="book-aum">{money.format(c.aum)}</span>
              <span className={`book-status status-${c.status.key}`}>{c.eventLabel || c.status.label}</span>
              <span className="book-contact">{contact}</span>
              <span className="book-reach">
                {digits ? (
                  <>
                    <a className="book-reach-btn call" href={telHref(c.phone)} onClick={(e) => e.stopPropagation()}>Call</a>
                    <a className="book-reach-btn whatsapp" href={whatsappHref(c.phone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>WA</a>
                  </>
                ) : null}
              </span>
              <span className={`book-open ${interactive ? "" : "muted"}`}>{interactive ? "Open →" : "No workspace"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
