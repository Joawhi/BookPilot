import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { EmptyState } from "../components/EmptyState";
import { apiGet, apiPost, ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { HomePayload, StudySetDetail } from "@shared/types";
import { MAX_PDFS_PER_UPLOAD } from "@shared/constants";

export function HomePage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [home, setHome] = useState<HomePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);

  const load = useCallback(() => {
    apiGet<HomePayload>("/api/home").then(setHome).catch((err) => {
      setError(err instanceof ApiError ? err.body.error : "Could not load home.");
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (list.length === 0) {
      setError("Please drop PDF files.");
      return;
    }
    if (list.length > MAX_PDFS_PER_UPLOAD) {
      setError("Up to 5 PDFs per upload.");
      return;
    }
    setBusy(true);
    setError(null);
    const body = new FormData();
    list.forEach((f) => body.append("files", f));
    try {
      const set = await apiPost<StudySetDetail>("/api/study-sets", body);
      nav(`/sets/${set.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.error : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="page">
        <p className="eyebrow">your reading room</p>
        <h1>{user?.displayName ? `Good to see you, ${user.displayName}.` : "Good to see you."}</h1>
        <p className="muted">Here’s what’s growing on your desk. Quiz and games cook in the background while you read.</p>
        {home && !home.llmEnabled ? (
          <div className="error-banner" style={{ marginBottom: 16 }}>
            No model key in <code>.env</code> (<code>OPENAI_API_KEY</code>). Quiz and explanations use a local extractive fallback until you add one and restart the server.
          </div>
        ) : null}

        <label
          className={`dropzone ${active ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setActive(true);
          }}
          onDragLeave={() => setActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setActive(false);
            upload(e.dataTransfer.files);
          }}
        >
          <h2>Drop PDFs to start a study set</h2>
          <p className="muted">Up to 5 files. Born-digital or OCR’d — scanned images without text will get a friendly warning.</p>
          <input
            type="file"
            accept="application/pdf"
            multiple
            hidden
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <span className="btn beet">{busy ? "Making your room…" : "Choose PDF files"}</span>
        </label>

        {error ? <div className="error-banner" style={{ marginTop: 16 }}>{error}</div> : null}

        {home?.continueReading ? (
          <div className="banner-continue">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <p className="eyebrow" style={{ color: "inherit", opacity: 0.75 }}>Pick up where you left off</p>
                <h2 style={{ margin: "8px 0 6px" }}>{home.continueReading.studySetTitle}</h2>
                <div className="muted">
                  {home.continueReading.documentName} · p.{home.continueReading.page}
                </div>
              </div>
              <Link className="btn ghost" to={`/sets/${home.continueReading.studySetId}/read/${home.continueReading.documentId}?page=${home.continueReading.page}`}>
                Continue reading
              </Link>
            </div>
          </div>
        ) : null}

        <section id="study-sets">
        <p className="eyebrow" style={{ marginTop: 40 }}>your collection</p>
        <h2>Study sets</h2>
        {!home?.studySets.length ? (
          <EmptyState title="The shelves are bare" body="Upload a paper, chapter, or notes PDF and BookPilot will grow a study set around it." />
        ) : (
          <div className="grid-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
            {home.studySets.map((s) => (
              <Link key={s.id} to={`/sets/${s.id}`} className="paper-card" style={{ padding: 20, textDecoration: "none", color: "inherit", display: "block" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>{s.title}</h3>
                <div className="muted" style={{ fontSize: 13 }}>
                  {s.documentCount} document{s.documentCount === 1 ? "" : "s"} · {s.noteCount} notes
                </div>
                <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: "var(--beet)" }}>
                  Continue reading
                </div>
              </Link>
            ))}
          </div>
        )}

        </section>

        <p className="eyebrow" style={{ marginTop: 40 }}>margins</p>
        <h2>Confusion points</h2>
        {!home?.confusionPoints.length ? (
          <p className="muted">Passages you flag while reading will gather here, like pressed flowers.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {home.confusionPoints.map((c) => (
              <Link
                key={c.noteId}
                to={`/sets/${c.studySetId}/read/${c.documentId}?page=${c.page}`}
                className="paper-card"
                style={{ padding: 16, textDecoration: "none", color: "inherit" }}
              >
                <div className="muted">
                  {c.studySetTitle} · {c.documentName} · p.{c.page}
                </div>
                <div>{c.passage.slice(0, 220)}{c.passage.length > 220 ? "…" : ""}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
