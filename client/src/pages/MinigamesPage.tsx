import { Link, useParams } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { apiPost } from "../api/client";

const GAMES = [
  { to: "match", type: "match_pairs", title: "Match Pairs", body: "Pair each term with its definition. Memory, but for your paper." },
  { to: "blank", type: "fill_blank", title: "Fill the Blank", body: "A key sentence, a missing word, a small word bank." },
  { to: "truefalse", type: "true_false", title: "True or False Blitz", body: "Rapid claims. Tap true or false before the sunflower burns down." },
  { to: "sequence", type: "sequence_sort", title: "Sequence Sort", body: "Drag process steps or timeline events into order." },
] as const;

export function MinigamesPage() {
  const { id } = useParams();
  return (
    <AppShell>
      <div className="page">
        <p className="muted">
          <Link to={`/sets/${id}`}>← Hub</Link>
        </p>
        <h1>Minigames</h1>
        <p className="muted">Grown from your PDFs. Freeze Time and Double Down work in every timed game.</p>
        <div className="grid-2" style={{ marginTop: 20 }}>
          {GAMES.map((g) => (
            <Link key={g.to} to={`/sets/${id}/games/${g.to}`} className="card embroidered" style={{ padding: 18, textDecoration: "none", color: "inherit" }}>
              <img src="/art/game-match.png" alt="" style={{ width: "100%", borderRadius: 16, border: "2px solid var(--ink)" }} />
              <h3>{g.title}</h3>
              <p className="muted">{g.body}</p>
            </Link>
          ))}
        </div>
        <button
          className="btn ghost"
          type="button"
          style={{ marginTop: 18 }}
          onClick={() => apiPost(`/api/study-sets/${id}/minigames/match_pairs/regenerate`)}
        >
          Regenerate all minigames
        </button>
      </div>
    </AppShell>
  );
}
