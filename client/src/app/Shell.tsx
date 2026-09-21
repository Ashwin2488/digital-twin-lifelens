import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const META: Record<string, { breadcrumb: string; title: string; subhead: string }> = {
  today: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / TODAY",
    title: "Good morning, Jamie.",
    subhead: "Three customers have high-intent life events worth reviewing today.",
  },
  customers: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / CUSTOMERS",
    title: "Your customers",
    subhead: "Filter to life events, then open the twin.",
  },
  future: {
    breadcrumb: "LIFELENS / FUTURE YOU",
    title: "Talk to your twin.",
    subhead: "Say what you’re becoming — then watch the same engine move the path.",
  },
  client: {
    breadcrumb: "RELATIONSHIP INTELLIGENCE / DIGITAL TWIN",
    title: "Client twin outlook",
    subhead: "See how this life event changes the next 12 months — then prepare to engage.",
  },
  developer: {
    breadcrumb: "LIFELENS / DEVELOPER",
    title: "How this actually works.",
    subhead: "Holdout evaluation, live detector lab, and this session's activity log.",
  },
};

function viewFromPath(pathname: string) {
  if (pathname.startsWith("/customers")) return "customers";
  if (pathname.startsWith("/future")) return "future";
  if (pathname.startsWith("/client")) return "client";
  if (pathname.startsWith("/developer")) return "developer";
  return "today";
}

export function Shell({ heading }: { heading?: string }) {
  const location = useLocation();
  const view = viewFromPath(location.pathname);
  const meta = META[view];
  const [mode, setMode] = useState<"thin" | "fat">("thin");
  const navView = view === "client" ? "today" : view;

  useEffect(() => {
    document.body.dataset.sidebar = mode;
  }, [mode]);

  return (
    <>
      <aside className="sidebar" data-mode={mode}>
        <NavLink className="brand" to="/today" aria-label="Standard Chartered · LifeLens">
          <img className="brand-mark" src="/assets/sc-mark.png" alt="" width={44} height={44} />
          <img className="brand-logo" src="/assets/sc-logo.png" alt="Standard Chartered" width={160} height={84} />
        </NavLink>
        <nav>
          <NavLink className={() => `nav-item${navView === "today" ? " active" : ""}`} to="/today">
            <span aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5.5v-5.5h-3V21H5a1 1 0 01-1-1v-9.5z"/></svg>
            </span>
            <small>Today</small>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} to="/customers">
            <span aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 21v-2a3.5 3.5 0 00-2.5-3.35"/><path d="M16.5 3.6a3.5 3.5 0 010 6.8"/></svg>
            </span>
            <small>Customers</small>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} to="/future">
            <span aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><path d="M5.6 5.6l2.1 2.1"/><path d="M16.3 16.3l2.1 2.1"/><path d="M18.4 5.6l-2.1 2.1"/><path d="M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.25"/></svg>
            </span>
            <small>Future You</small>
          </NavLink>
          <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} to="/developer">
            <span aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l-6-6 6-6"/><path d="M15 6l6 6-6 6"/></svg>
            </span>
            <small>Developer</small>
          </NavLink>
        </nav>
        <div className="side-bottom">
          <button className="rm-chip" type="button" aria-label="Jamie Lee, account menu">
            <span className="avatar" aria-hidden="true">JL</span>
            <span className="rm-meta"><strong>Jamie Lee</strong><small>Relationship Manager</small></span>
          </button>
        </div>
      </aside>
      <div className="sidebar-controls" data-mode={mode}>
        <button className="sidebar-toggle" type="button" aria-label="Collapse navigation" onClick={() => setMode("thin")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
        </button>
        <button className="sidebar-toggle" type="button" aria-label="Expand navigation" onClick={() => setMode("fat")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </button>
      </div>
      <main className="shell">
        <header className="topbar">
          <div>
            <p className="breadcrumb">{meta.breadcrumb}</p>
            <h1>{heading || meta.title}</h1>
            <p className="subhead">{meta.subhead}</p>
          </div>
        </header>
        <Outlet />
      </main>
    </>
  );
}
