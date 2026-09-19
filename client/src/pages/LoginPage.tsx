import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import { LOCAL_DEV_USER } from "@shared/devAuth";

export function LoginPage() {
  const { user, login, register } = useAuth();
  const location = useLocation();
  const isSignup = location.pathname === "/signup";
  const [email, setEmail] = useState(LOCAL_DEV_USER.email);
  const [password, setPassword] = useState(LOCAL_DEV_USER.password);
  const [displayName, setDisplayName] = useState(LOCAL_DEV_USER.displayName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSignup) await register(email, password, displayName || email.split("@")[0]!);
      else await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.error : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: "100vh" }}>
      <div style={{ padding: 48, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div className="brand" style={{ marginBottom: 24 }}>
          <img src="/art/app-icon.png" alt="" />
          BookPilot
        </div>
        <h1>{isSignup ? "Pull up a chair." : "Welcome back, reader."}</h1>
        <p className="muted">A warm desk for dense papers — explanations, real citations, and a little game on the side.</p>
        <form onSubmit={onSubmit} className="card embroidered" style={{ padding: 28, marginTop: 16, maxWidth: 440 }}>
          {isSignup ? (
            <label className="field">
              Name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Joaquin" />
            </label>
          ) : null}
          <label className="field" style={{ marginTop: 12 }}>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field" style={{ marginTop: 12 }}>
            Password
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <div className="error-banner" style={{ marginTop: 14 }}>{error}</div> : null}
          <button className="btn beet" style={{ marginTop: 18, width: "100%" }} disabled={busy}>
            {busy ? "One moment…" : isSignup ? "Create account" : "Enter the library"}
          </button>
          <p className="muted" style={{ marginTop: 14 }}>
            {isSignup ? (
              <>Already planted? <Link to="/login">Sign in</Link></>
            ) : (
              <>New here? <Link to="/signup">Create an account</Link></>
            )}
          </p>
        </form>
      </div>
      <div
        className="login-art"
        style={{
          background: "var(--paper)",
          borderLeft: "3px solid var(--ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img src="/art/ornament-vine.png" alt="" style={{ position: "absolute", left: 0, top: 0, height: "100%", opacity: 0.9 }} />
        <img src="/art/login-hero.png" alt="Folk-art harvest around an open book" style={{ maxWidth: "92%", borderRadius: 28, border: "3px solid var(--ink)" }} />
      </div>
    </div>
  );
}
