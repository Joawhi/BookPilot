import type { GameType } from "@shared/types";

export function AccuracyChart({
  points,
}: {
  points: { date: string; accuracy: number; gameType: GameType }[];
}) {
  if (points.length === 0) {
    return <p className="muted">Play a quiz or minigame to see accuracy over time.</p>;
  }
  const w = 360;
  const h = 120;
  const xs = points.map((_, i) => (i / Math.max(points.length - 1, 1)) * (w - 24) + 12);
  const ys = points.map((p) => h - 16 - p.accuracy * (h - 32));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Accuracy over time">
      <rect x="0" y="0" width={w} height={h} fill="#fffdf8" rx="12" />
      <path d={d} fill="none" stroke="#1e3a5f" strokeWidth="3" />
      {xs.map((x, i) => (
        <circle key={points[i]!.date + i} cx={x} cy={ys[i]} r="4" fill="#c44536" />
      ))}
    </svg>
  );
}
