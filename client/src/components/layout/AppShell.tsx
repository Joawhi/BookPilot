import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { ReactNode } from "react";

function BookIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className="brand" to="/" style={light ? { color: "var(--sidebar-fg)" } : { color: "var(--ink)" }}>
      <span className="brand-mark">
        <BookIcon />
      </span>
      BookPilot
    </Link>
  );
}

function Botanical() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 90" width="72" height="64" style={{ color: "var(--sunflower)" }}>
      <path d="M47 84C50 67 51 50 51 31" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M52 44C29 45 18 34 19 16c19-1 31 7 33 28M50 61c21 3 31-6 32-22-17-4-28 3-32 22" fill="currentColor" opacity=".88" />
      <circle cx="52" cy="22" r="9" fill="var(--sunflower)" stroke="var(--cream)" strokeWidth="3" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const initial = (user?.displayName?.[0] ?? user?.email?.[0] ?? "R").toUpperCase();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Brand light />
        <div className="sidebar-nav">
          <p>your desk</p>
          <NavLink className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`} end to="/">
            Home
          </NavLink>
          <a className="sidebar-link" href="/#study-sets">
            Study sets
          </a>
          <div className="sidebar-note">
            <Botanical />
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.03em", margin: "8px 0 4px", color: "inherit" }}>
              A little each day.
            </p>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: "color-mix(in srgb, var(--sidebar-fg) 60%, transparent)" }}>
              Small marks become a body of work.
            </p>
          </div>
        </div>
        <div className="sidebar-foot">
          <span className="avatar">{initial}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.displayName ?? "Reader"}</div>
            <div style={{ fontSize: 12, opacity: 0.55 }}>private study room</div>
          </div>
          <button className="btn ghost" onClick={logout} type="button" style={{ padding: "8px 10px", boxShadow: "none", color: "inherit", background: "transparent", border: 0 }}>
            Out
          </button>
        </div>
      </aside>
      <div style={{ minWidth: 0, flex: 1 }}>
        <header className="topbar">
          <Brand />
          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="avatar">{initial}</span>
            <button className="btn ghost" onClick={logout} type="button">
              Sign out
            </button>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
