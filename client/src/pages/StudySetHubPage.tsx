import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { StatusChip } from "../components/StatusChip";
import { apiGet, apiPost } from "../api/client";
import type { StudySetDetail } from "@shared/types";

const CARDS = [
  { to: "read", title: "Read", img: "/art/card-read.png", body: "An immersive paper desk. Select any line for an explanation or real references." },
  { to: "quiz", title: "Quiz", img: "/art/card-quiz.png", body: "Ten questions, a ticking sunflower, streaks and powerups. Flagged passages go first." },
  { to: "games", title: "Minigames", img: "/art/card-games.png", body: "Match, fill, blitz, and sort — all grown from your PDFs." },
  { to: "notes", title: "Notes & Progress", img: "/art/card-notes.png", body: "Saved passages, recaps, scores, and the topics that still bite." },
] as const;

export function StudySetHubPage() {
  const { id } = useParams();
  const [set, setSet] = useState<StudySetDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    const tick = () => {
      apiGet<StudySetDetail>(`/api/study-sets/${id}`).then((row) => {
        if (live) setSet(row);
      });
    };
    tick();
    const t = window.setInterval(tick, 2500);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [id]);

  if (!set) return <AppShell><div className="page">Loading the orchard…</div></AppShell>;

  const readDoc = set.documents.find((d) => d.hasExtractableText) ?? set.documents[0];
  const quizLocked = set.quizStatus !== "ready";
  const gamesLocked = set.gamesStatus !== "ready";

  return (
    <AppShell>
      <div className="page">
        <p className="eyebrow">your desk</p>
        <p className="muted"><Link to="/">Home</Link> / {set.title}</p>
        <h1>{set.title}</h1>
        <p className="muted">{set.documents.length} document{set.documents.length === 1 ? "" : "s"} · generation runs in the background, you can read immediately.</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          <StatusChip status={set.quizStatus} label="Quiz" />
          <StatusChip status={set.gamesStatus} label="Minigames" />
          <button className="btn ghost" type="button" onClick={() => apiPost(`/api/study-sets/${set.id}/regenerate`, { target: "all" })}>
            Regenerate
          </button>
        </div>

        {set.quizError ? (
          <div className="error-banner" style={{ marginBottom: 16 }}>
            {set.quizError}
          </div>
        ) : null}

        {set.documents.some((d) => !d.hasExtractableText) ? (
          <div className="error-banner" style={{ marginBottom: 16 }}>
            Some files look scanned and have no text layer. They won’t feed the quiz until you add an OCR’d copy.
          </div>
        ) : null}

        <h3>Documents</h3>
        <ul>
          {set.documents.map((d) => (
            <li key={d.id}>
              <Link to={`/sets/${set.id}/read/${d.id}`}>{d.originalName}</Link>
              <span className="muted"> · {d.pageCount} pages{d.scanWarning ? " · no extractable text" : ""}</span>
            </li>
          ))}
        </ul>

        <div className="grid-4" style={{ marginTop: 24 }}>
          {CARDS.map((c) => {
            const locked = (c.to === "quiz" && quizLocked) || (c.to === "games" && gamesLocked);
            const href =
              c.to === "read"
                ? `/sets/${set.id}/read/${readDoc?.id ?? ""}`
                : `/sets/${set.id}/${c.to}`;
            return (
              <Link
                key={c.to}
                to={locked ? "#" : href}
                onClick={(e) => locked && e.preventDefault()}
                className="paper-card"
                style={{ padding: 16, textDecoration: "none", color: "inherit", opacity: locked ? 0.55 : 1 }}
              >
                <img src={c.img} alt="" style={{ width: "100%", borderRadius: 16 }} />
                <h3 style={{ marginTop: 12 }}>{c.title}</h3>
                <p className="muted">{c.body}</p>
                {locked ? <StatusChip status={c.to === "quiz" ? set.quizStatus : set.gamesStatus} label={c.title} /> : null}
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
