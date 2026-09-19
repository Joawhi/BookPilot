import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameShell, useGameTimer } from "../../components/games/GameShell";
import { apiGet, apiPost } from "../../api/client";
import { celebrate } from "../../lib/celebrate";
import { timedInventory } from "../gameHelpers";
import type { MinigamePayload, PowerupType, SequencePuzzle } from "@shared/types";

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function SequenceSortPage() {
  const { id } = useParams();
  const [puzzles, setPuzzles] = useState<SequencePuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [inventory, setInventory] = useState(timedInventory());
  const [double, setDouble] = useState(false);
  const [used, setUsed] = useState<PowerupType | null>(null);
  const [done, setDone] = useState(false);
  const [hits, setHits] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const timer = useGameTimer(40);

  useEffect(() => {
    if (!id) return;
    apiGet<MinigamePayload>(`/api/study-sets/${id}/minigames/sequence_sort`).then((p) => {
      const list = p.sequences ?? [];
      setPuzzles(list);
      if (list[0]) setOrder(shuffle(list[0].items.map((i) => i.id)));
    });
  }, [id]);

  const puzzle = puzzles[index];

  function move(from: number, to: number) {
    setOrder((curr) => {
      const next = [...curr];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  }

  function submit() {
    if (!puzzle) return;
    const ok = order.join() === puzzle.correctOrder.join();
    const ns = ok ? streak + 1 : 0;
    setStreak(ns);
    setBest((b) => Math.max(b, ns));
    if (ok) {
      const pts = Math.round((120 + timer.left) * (ns >= 5 ? 2 : ns >= 3 ? 1.5 : 1) * (double ? 2 : 1));
      setScore((s) => s + pts);
      setHits((h) => h + 1);
      if (ns === 3 || ns === 5) celebrate("streak");
    } else if (puzzle.concept) setMissed((m) => [...m, puzzle.concept!]);
    setDouble(false);
    setUsed(null);
    if (index + 1 >= puzzles.length) void finish(ok ? hits + 1 : hits, ns);
    else {
      const next = puzzles[index + 1]!;
      setIndex((i) => i + 1);
      setOrder(shuffle(next.items.map((i) => i.id)));
      timer.reset(40);
    }
  }

  async function finish(correctCount = hits, finalStreak = best) {
    if (done || !id) return;
    setDone(true);
    timer.setRunning(false);
    celebrate("win");
    await apiPost(`/api/study-sets/${id}/games/finish`, {
      gameType: "sequence_sort",
      score,
      accuracy: puzzles.length ? correctCount / puzzles.length : 0,
      bestStreak: Math.max(best, finalStreak),
      missedConcepts: missed,
    });
  }

  useEffect(() => {
    if (timer.left === 0 && puzzle && !done) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.left]);

  function onPowerup(type: PowerupType) {
    if (used || inventory[type] <= 0) return;
    setInventory((inv) => ({ ...inv, [type]: inv[type] - 1 }));
    setUsed(type);
    if (type === "freeze_time") timer.freeze();
    if (type === "double_down") setDouble(true);
  }

  if (done) {
    return (
      <div className="page">
        <h1>Sequences sorted</h1>
        <p>Score {score}</p>
        <Link className="btn" to={`/sets/${id}/games`}>Back</Link>
      </div>
    );
  }
  if (!puzzle) return <div className="page">Loading…</div>;

  return (
    <GameShell
      title="Sequence Sort"
      subtitle={`${puzzle.title} · ${index + 1} / ${puzzles.length}`}
      score={score}
      streak={streak}
      left={timer.left}
      frozen={timer.frozen}
      inventory={inventory}
      allowedPowerups={["freeze_time", "double_down"]}
      onPowerup={onPowerup}
    >
      <div className="paper-card" style={{ padding: 20 }}>
        <p className="muted">Drag the steps into the right order, then lock it in.</p>
        {order.map((oid, i) => {
          const item = puzzle.items.find((x) => x.id === oid);
          return (
            <div
              key={oid}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null) move(drag, i);
                setDrag(null);
              }}
              className="card"
              style={{ padding: 12, marginBottom: 8, cursor: "grab" }}
            >
              {i + 1}. {item?.text}
            </div>
          );
        })}
        <button className="btn beet" type="button" onClick={submit}>
          Lock order
        </button>
      </div>
    </GameShell>
  );
}
