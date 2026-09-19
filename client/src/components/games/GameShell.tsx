import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "../layout/AppShell";
import { PowerupBar } from "./PowerupBar";
import type { PowerupType } from "@shared/types";
import { FREEZE_SECONDS } from "@shared/constants";

export function useGameTimer(maxSeconds: number) {
  const [left, setLeft] = useState(maxSeconds);
  const [frozen, setFrozen] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setFrozen((f) => {
        if (f > 0) return f - 1;
        setLeft((n) => Math.max(0, n - 1));
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return {
    left,
    frozen,
    running,
    setRunning,
    reset(seconds = maxSeconds) {
      setLeft(seconds);
      setFrozen(0);
    },
    freeze() {
      setFrozen(FREEZE_SECONDS);
    },
  };
}

export function GameShell({
  title,
  subtitle,
  score,
  streak,
  left,
  frozen,
  inventory,
  allowedPowerups,
  powerupsDisabled,
  onPowerup,
  children,
}: {
  title: string;
  subtitle?: string;
  score: number;
  streak: number;
  left: number;
  frozen: number;
  inventory: Record<PowerupType, number>;
  allowedPowerups?: PowerupType[];
  powerupsDisabled?: boolean;
  onPowerup: (type: PowerupType) => void;
  children: ReactNode;
}) {
  return (
    <AppShell>
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <span className="chip">Score {score}</span>
          <span className="chip">Streak {streak}</span>
          <span className="chip" style={{ background: frozen ? "#cfe4f7" : "var(--sunflower)" }}>
            {frozen ? `Frozen ${frozen}s` : `${left}s`}
          </span>
        </div>
      </div>
      <div style={{ margin: "12px 0 18px" }}>
        <PowerupBar inventory={inventory} allowed={allowedPowerups} onUse={onPowerup} disabled={powerupsDisabled} />
      </div>
      {children}
    </div>
    </AppShell>
  );
}
