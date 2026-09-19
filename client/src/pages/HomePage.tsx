import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { EmptyState } from "../components/EmptyState";
import { apiGet, apiPost, ApiError } from "../api/client";
import type { HomePayload, StudySetDetail } from "@shared/types";
import { MAX_PDFS_PER_UPLOAD } from "@shared/constants";

export function HomePage() {
  const nav = useNavigate();
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
        <h1>Your harvest of readings</h1>
        <p className="muted">Drop one or more PDFs to start learning. Quiz and games cook in the background while you read.</p>

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
          <img src="/art/upload-harvest.png" alt="" style={{ width: "min(520px, 100%)", borderRadius: 20 }} />
          <h2>Drop one or more PDFs to start learning</h2>
          <p className="muted">Up to 5 files. Born-digital or OCR’d — scanned images without text will get a friendly warning.</p>
          <input
            type="file"
            accept="application/pdf"
            multiple
            hidden
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <span className="btn beet">{busy ? "Planting…" : "Or browse files"}</span>
        </label>

        {error ? <div className="error-banner" style={{ marginTop: 16 }}>{error}</div> : null}

        {home?.continueReading ? (
          <div className="card" style={{ padding: 18, marginTop: 28, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <strong>Continue reading</strong>
              <div className="muted">
                {home.continueReading.studySetTitle} · {home.continueReading.documentName} · p.{home.continueReading.page}
              </div>
            </div>
            <Link className="btn" to={`/sets/${home.continueReading.studySetId}/read/${home.continueReading.documentId}?page=${home.continueReading.page}`}>
              Pick up where you left off
            </Link>
          </div>
        ) : null}

        <h2 style={{ marginTop: 36 }}>Study sets</h2>
        {!home?.studySets.length ? (
          <EmptyState title="The shelves are bare" body="Upload a paper, chapter, or notes PDF and BookPilot will grow a study set around it." />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {home.studySets.map((s) => (
              <Link key={s.id} to={`/sets/${s.id}`} className="card" style={{ padding: 18, textDecoration: "none", color: "inherit", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{s.title}</h3>
                  <div className="muted">
                    {new Date(s.createdAt).toLocaleDateString()} · {s.documentCount} doc{s.documentCount === 1 ? "" : "s"} · {s.noteCount} notes
                  </div>
                </div>
                <span className="chip">Best {s.bestScore}</span>
              </Link>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 36 }}>Confusion points</h2>
        {!home?.confusionPoints.length ? (
          <p className="muted">Passages you flag while reading will gather here, like pressed flowers.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {home.confusionPoints.map((c) => (
              <Link
                key={c.noteId}
                to={`/sets/${c.studySetId}/read/${c.documentId}?page=${c.page}`}
                className="card"
                style={{ padding: 14, textDecoration: "none", color: "inherit" }}
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
