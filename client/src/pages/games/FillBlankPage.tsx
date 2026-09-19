import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GameShell, useGameTimer } from "../../components/games/GameShell";
import { apiGet, apiPost } from "../../api/client";
import { celebrate } from "../../lib/celebrate";
import { timedInventory } from "../gameHelpers";
import type { FillBlankItem, MinigamePayload, PowerupType } from "@shared/types";

export function FillBlankPage() {
  const { id } = useParams();
  const [items, setItems] = useState<FillBlankItem[]>([]);
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
  const timer = useGameTimer(18);

  useEffect(() => {
    if (!id) return;
    apiGet<MinigamePayload>(`/api/study-sets/${id}/minigames/fill_blank`).then((p) => setItems(p.fillBlanks ?? []));
  }, [id]);

  const item = items[index];

  function pick(word: string) {
    if (!item || done) return;
    const ok = word.toLowerCase() === item.answer.toLowerCase();
    const ns = ok ? streak + 1 : 0;
    setStreak(ns);
    setBest((b) => Math.max(b, ns));
    if (ok) {
      const pts = Math.round((80 + timer.left * 2) * (ns >= 5 ? 2 : ns >= 3 ? 1.5 : 1) * (double ? 2 : 1));
      setScore((s) => s + pts);
      setHits((h) => h + 1);
      if (ns === 3 || ns === 5) celebrate("streak");
    } else if (item.concept) setMissed((m) => [...m, item.concept!]);
    setDouble(false);
    setUsed(null);
    if (index + 1 >= items.length) {
      void finish(ok ? hits + 1 : hits, ns);
    } else {
      setIndex((i) => i + 1);
      timer.reset(18);
    }
  }

  async function finish(correctCount = hits, finalStreak = best) {
    if (done || !id) return;
    setDone(true);
    timer.setRunning(false);
    celebrate("win");
    await apiPost(`/api/study-sets/${id}/games/finish`, {
      gameType: "fill_blank",
      score,
      accuracy: items.length ? correctCount / items.length : 0,
      bestStreak: Math.max(best, finalStreak),
      missedConcepts: missed,
    });
  }

  useEffect(() => {
    if (timer.left === 0 && item && !done) pick("");
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
        <h1>Blanks filled</h1>
        <p>Score {score}</p>
        <Link className="btn" to={`/sets/${id}/games`}>Back</Link>
      </div>
    );
  }
  if (!item) return <div className="page">Loading…</div>;

  return (
    <GameShell
      title="Fill the Blank"
      subtitle={`${index + 1} / ${items.length}`}
      score={score}
      streak={streak}
      left={timer.left}
      frozen={timer.frozen}
      inventory={inventory}
      allowedPowerups={["freeze_time", "double_down"]}
      onPowerup={onPowerup}
    >
      <div className="card embroidered" style={{ padding: 24 }}>
        <h2>{item.sentence}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {item.bank.map((w) => (
            <button key={w} className="btn" type="button" onClick={() => pick(w)}>
              {w}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
