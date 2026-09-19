import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameShell, useGameTimer } from "../../components/games/GameShell";
import { apiGet, apiPost } from "../../api/client";
import { celebrate } from "../../lib/celebrate";
import { timedInventory } from "../gameHelpers";
import type { MatchPair, MinigamePayload, PowerupType } from "@shared/types";

type Card = { id: string; pairId: string; text: string; kind: "term" | "def" };

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function MatchPairsPage() {
  const { id } = useParams();
  const [pairs, setPairs] = useState<MatchPair[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [inventory, setInventory] = useState(timedInventory());
  const [double, setDouble] = useState(false);
  const [used, setUsed] = useState<PowerupType | null>(null);
  const [done, setDone] = useState(false);
  const timer = useGameTimer(90);

  useEffect(() => {
    if (!id) return;
    apiGet<MinigamePayload>(`/api/study-sets/${id}/minigames/match_pairs`).then((p) => {
      const list = p.matchPairs ?? [];
      setPairs(list);
      setCards(
        shuffle(
          list.flatMap((pair) => [
            { id: `${pair.id}-t`, pairId: pair.id, text: pair.term, kind: "term" as const },
            { id: `${pair.id}-d`, pairId: pair.id, text: pair.definition, kind: "def" as const },
          ]),
        ),
      );
    });
  }, [id]);

  function click(card: Card) {
    if (done || matched.includes(card.pairId) || open.includes(card.id) || open.length === 2) return;
    const next = [...open, card.id];
    setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next.map((cid) => cards.find((c) => c.id === cid)!);
    const good = a.pairId === b.pairId && a.kind !== b.kind;
    window.setTimeout(() => {
      if (good) {
        const ns = streak + 1;
        setMatched((m) => [...m, a.pairId]);
        setStreak(ns);
        setBest((b0) => Math.max(b0, ns));
        const pts = Math.round((80 + timer.left) * (ns >= 5 ? 2 : ns >= 3 ? 1.5 : 1) * (double ? 2 : 1));
        setScore((s) => s + pts);
        setDouble(false);
        setUsed(null);
        if (ns === 3 || ns === 5) celebrate("streak");
        if (matched.length + 1 >= pairs.length) finish(true, score + pts, ns);
      } else {
        setStreak(0);
      }
      setOpen([]);
    }, 480);
  }

  async function finish(won: boolean, finalScore = score, finalStreak = best) {
    if (done || !id) return;
    setDone(true);
    timer.setRunning(false);
    if (won) celebrate("win");
    await apiPost(`/api/study-sets/${id}/games/finish`, {
      gameType: "match_pairs",
      score: finalScore,
      accuracy: pairs.length ? matched.length / pairs.length : 0,
      bestStreak: Math.max(best, finalStreak),
      missedConcepts: [],
    });
  }

  useEffect(() => {
    if (timer.left === 0 && !done) void finish(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.left]);

  function onPowerup(type: PowerupType) {
    if (used || inventory[type] <= 0) return;
    setInventory((inv) => ({ ...inv, [type]: inv[type] - 1 }));
    setUsed(type);
    if (type === "freeze_time") timer.freeze();
    if (type === "double_down") setDouble(true);
  }

  const status = useMemo(() => `${matched.length} / ${pairs.length} pairs`, [matched.length, pairs.length]);

  if (done) {
    return (
      <div className="page">
        <h1>Match complete</h1>
        <p>Score {score} · {status}</p>
        <Link className="btn" to={`/sets/${id}/games`}>Back</Link>
      </div>
    );
  }

  return (
    <GameShell
      title="Match Pairs"
      subtitle={status}
      score={score}
      streak={streak}
      left={timer.left}
      frozen={timer.frozen}
      inventory={inventory}
      allowedPowerups={["freeze_time", "double_down"]}
      onPowerup={onPowerup}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {cards.map((c) => {
          const isOpen = open.includes(c.id) || matched.includes(c.pairId);
          return (
            <button
              key={c.id}
              type="button"
              className="card"
              onClick={() => click(c)}
              style={{
                minHeight: 92,
                padding: 12,
                background: matched.includes(c.pairId) ? "#e5f0d8" : isOpen ? "var(--sunflower)" : "var(--deep)",
                color: matched.includes(c.pairId) || isOpen ? "var(--ink)" : "var(--paper)",
              }}
            >
              {isOpen ? c.text : "✦"}
            </button>
          );
        })}
      </div>
    </GameShell>
  );
}
