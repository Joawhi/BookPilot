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
    <div className="login-grid">
      <div className="login-copy animate-float-in">
        <div className="brand" style={{ marginBottom: 28, color: "var(--ink)" }}>
          <span className="brand-mark">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          BookPilot
        </div>
        <p className="eyebrow">a private room for big ideas</p>
        <h1 className="login-title">
          Read deeply.
          <br />
          <span style={{ color: "var(--beet)" }}>Remember more.</span>
        </h1>
        <p className="muted" style={{ maxWidth: 460, fontSize: "1.05rem", lineHeight: 1.65 }}>
          A warm desk for dense papers — explanations, real citations, and a little game on the side.
        </p>
        <form onSubmit={onSubmit} className="paper-card" style={{ padding: 28, marginTop: 22, maxWidth: 440 }}>
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
            {busy ? "One moment…" : isSignup ? "Open your desk" : "Enter the library"}
          </button>
          <p className="muted" style={{ marginTop: 14 }}>
            {isSignup ? (
              <>Already planted? <Link to="/login">Sign in</Link></>
            ) : (
              <>New here? <Link to="/signup">Create an account</Link></>
            )}
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>Your PDFs stay private — never shared.</p>
        </form>
      </div>
      <div className="login-art animate-float-in">
        <div className="login-blob" />
        <div className="login-hero-card">
          <div className="login-hero-top">
            <span className="brand" style={{ fontSize: "1.1rem" }}>today’s little harvest</span>
            <span className="eyebrow" style={{ margin: 0 }}>04 / 12</span>
          </div>
          <div className="login-hero-body">
            <p className="eyebrow" style={{ color: "var(--leaf)" }}>currently reading</p>
            <h2 style={{ fontSize: "1.7rem", marginTop: 8 }}>The Work of Art in the Age of Mechanical Reproduction</h2>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: "68%" }} />
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>page 14 of 21 · 12 min left</p>
          </div>
          <div className="login-hero-foot">
            <div>
              <p className="brand" style={{ fontSize: "1.4rem", margin: 0 }}>7 days</p>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>of showing up</p>
            </div>
            <svg aria-hidden="true" viewBox="0 0 100 90" width="88" height="72" style={{ color: "var(--leaf)" }}>
              <path d="M47 84C50 67 51 50 51 31" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
              <path d="M52 44C29 45 18 34 19 16c19-1 31 7 33 28M50 61c21 3 31-6 32-22-17-4-28 3-32 22" fill="currentColor" opacity=".88" />
              <circle cx="52" cy="22" r="9" fill="var(--sunflower)" stroke="var(--ink)" strokeWidth="3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
