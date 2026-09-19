import type { PowerupType } from "@shared/types";

const LABELS: Record<PowerupType, { name: string; hint: string }> = {
  freeze_time: { name: "Freeze Time", hint: "Pause the timer 10s" },
  double_down: { name: "Double Down", hint: "This question is worth 2×" },
  fifty_fifty: { name: "50/50", hint: "Drop two wrong answers" },
  second_chance: { name: "Second Chance", hint: "Retry once for half points" },
  hint: { name: "Hint", hint: "Source snippet (−25 pts)" },
};

export function PowerupBar({
  inventory,
  disabled,
  allowed,
  onUse,
}: {
  inventory: Record<PowerupType, number>;
  disabled?: boolean;
  allowed?: PowerupType[];
  onUse: (type: PowerupType) => void;
}) {
  const keys = (Object.keys(LABELS) as PowerupType[]).filter((k) => !allowed || allowed.includes(k));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          className="btn ghost"
          disabled={disabled || inventory[key] <= 0}
          title={LABELS[key].hint}
          onClick={() => onUse(key)}
          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
        >
          {LABELS[key].name} ×{inventory[key]}
        </button>
      ))}
    </div>
  );
}
