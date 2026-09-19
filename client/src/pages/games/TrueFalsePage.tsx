import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameShell, useGameTimer } from "../../components/games/GameShell";
import { apiGet, apiPost } from "../../api/client";
import { celebrate } from "../../lib/celebrate";
import { timedInventory } from "../gameHelpers";
import type { MinigamePayload, PowerupType, TrueFalseItem } from "@shared/types";

export function TrueFalsePage() {
  const { id } = useParams();
  const [items, setItems] = useState<TrueFalseItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [inventory, setInventory] = useState(timedInventory());
  const [double, setDouble] = useState(false);
  const [used, setUsed] = useState<PowerupType | null>(null);
  const [done, setDone] = useState(false);
  const [hits, setHits] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useGameTimer(8);

  useEffect(() => {
    if (!id) return;
    apiGet<MinigamePayload>(`/api/study-sets/${id}/minigames/true_false`).then((p) => setItems(p.trueFalse ?? []));
  }, [id]);

  const item = items[index];

  function answer(value: boolean) {
    if (!item || done) return;
    const ok = value === item.isTrue;
    const ns = ok ? streak + 1 : 0;
    setStreak(ns);
    setBest((b) => Math.max(b, ns));
    setFlash(item.explanation);
    if (ok) {
      const pts = Math.round((70 + timer.left * 4) * (ns >= 5 ? 2 : ns >= 3 ? 1.5 : 1) * (double ? 2 : 1));
      setScore((s) => s + pts);
      setHits((h) => h + 1);
      if (ns === 3 || ns === 5) celebrate("streak");
    } else if (item.concept) setMissed((m) => [...m, item.concept!]);
    setDouble(false);
    setUsed(null);
    window.setTimeout(() => {
      setFlash(null);
      if (index + 1 >= items.length) void finish(ok ? hits + 1 : hits, ns);
      else {
        setIndex((i) => i + 1);
        timer.reset(8);
      }
    }, 700);
  }

  async function finish(correctCount = hits, finalStreak = best) {
    if (done || !id) return;
    setDone(true);
    timer.setRunning(false);
    celebrate("win");
    await apiPost(`/api/study-sets/${id}/games/finish`, {
      gameType: "true_false",
      score,
      accuracy: items.length ? correctCount / items.length : 0,
      bestStreak: Math.max(best, finalStreak),
      missedConcepts: missed,
    });
  }

  useEffect(() => {
    if (timer.left === 0 && item && !done && !flash) answer(!item.isTrue);
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
        <h1>Blitz over</h1>
        <p>Score {score}</p>
        <Link className="btn" to={`/sets/${id}/games`}>Back</Link>
      </div>
    );
  }
  if (!item) return <div className="page">Loading…</div>;

  return (
    <GameShell
      title="True or False Blitz"
      subtitle={`${index + 1} / ${items.length}`}
      score={score}
      streak={streak}
      left={timer.left}
      frozen={timer.frozen}
      inventory={inventory}
      allowedPowerups={["freeze_time", "double_down"]}
      onPowerup={onPowerup}
    >
      <div className="card embroidered" style={{ padding: 28, minHeight: 220 }}>
        <h2>{item.text}</h2>
        {flash ? <p className="muted">{flash}</p> : null}
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button className="btn leaf" type="button" onClick={() => answer(true)} style={{ flex: 1, minHeight: 64 }}>
            True
          </button>
          <button className="btn beet" type="button" onClick={() => answer(false)} style={{ flex: 1, minHeight: 64 }}>
            False
          </button>
        </div>
      </div>
    </GameShell>
  );
}
