import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div>
      <header className="topbar">
        <Link className="brand" to="/">
          <img src="/art/app-icon.png" alt="" />
          BookPilot
        </Link>
        <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="muted">{user?.displayName}</span>
          <button className="btn ghost" onClick={logout} type="button">
            Sign out
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
