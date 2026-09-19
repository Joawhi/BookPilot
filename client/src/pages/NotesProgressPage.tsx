import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AccuracyChart } from "../components/AccuracyChart";
import { PaperList } from "../components/reader/SidePanel";
import { apiGet } from "../api/client";
import type { ProgressPayload } from "@shared/types";

const GAME_LABEL: Record<string, string> = {
  quiz: "Quiz",
  match_pairs: "Match Pairs",
  fill_blank: "Fill the Blank",
  true_false: "True/False",
  sequence_sort: "Sequence Sort",
};

export function NotesProgressPage() {
  const { id } = useParams();
  const [data, setData] = useState<ProgressPayload | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<ProgressPayload>(`/api/study-sets/${id}/progress`).then(setData);
  }, [id]);

  if (!data) return <AppShell><div className="page">Gathering notes…</div></AppShell>;

  return (
    <AppShell>
      <div className="page">
        <p className="muted"><Link to={`/sets/${id}`}>← Hub</Link></p>
        <h1>Notes & Progress</h1>
        <div className="grid-2">
          <div className="card" style={{ padding: 18 }}>
            <h3>Total points</h3>
            <p style={{ fontSize: "2rem", fontFamily: "var(--font-serif)" }}>{data.totalPoints}</p>
            <h3>Best scores</h3>
            <ul>
              {Object.entries(data.bestScores).map(([k, v]) => (
                <li key={k}>{GAME_LABEL[k] ?? k}: {v}</li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <h3>Accuracy over time</h3>
            <AccuracyChart points={data.accuracyOverTime} />
          </div>
        </div>

        <h2 style={{ marginTop: 28 }}>Topics to review</h2>
        {data.topicsToReview.length === 0 ? (
          <p className="muted">Missed concepts from quizzes and games will land here, and show up more often next round.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {data.topicsToReview.map((t) => (
              <span key={t.name} className="chip" style={{ background: "#f7d5cf" }}>
                {t.name} · missed {t.missCount}
              </span>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 28 }}>Saved notes</h2>
        {data.notes.length === 0 ? <p className="muted">No notes yet — select a passage in the reader.</p> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {data.notes.map((n) => (
            <article key={n.id} className="card" style={{ padding: 16 }}>
              {n.flagged ? <span className="chip" style={{ background: "#f7d5cf" }}>confusing</span> : null}
              <div className="muted">{n.documentName} · p.{n.page}</div>
              <p>{n.passage}</p>
              {n.explanation ? <p><em>{n.explanation}</em></p> : null}
              {n.comment ? <p className="muted">You: {n.comment}</p> : null}
              <PaperList papers={n.references} />
              <Link to={`/sets/${id}/read/${n.documentId}?page=${n.page}`}>Open in reader</Link>
            </article>
          ))}
        </div>

        <h2 style={{ marginTop: 28 }}>Session recaps</h2>
        {data.recaps.length === 0 ? <p className="muted">End a reading session to grow a recap here.</p> : null}
        {data.recaps.map((r) => (
          <article key={r.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div className="muted">{new Date(r.endedAt).toLocaleString()}</div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)" }}>{r.recap}</pre>
            <PaperList papers={r.references} />
          </article>
        ))}
      </div>
    </AppShell>
  );
}
