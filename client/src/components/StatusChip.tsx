import type { FeatureStatus } from "@shared/types";

export function StatusChip({ status, label }: { status: FeatureStatus; label: string }) {
  const text =
    status === "ready"
      ? `${label} ready`
      : status === "generating"
        ? `Weaving ${label.toLowerCase()}…`
        : status === "failed"
          ? `${label} failed`
          : `${label} waiting`;
  return (
    <span className={`chip ${status}`}>
      {status === "generating" ? <span className="pulse" /> : null}
      {text}
      <style>{`
        .pulse {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--beet);
          animation: pulse 1s infinite;
        }
        @keyframes pulse { 50% { opacity: 0.3; transform: scale(0.8); } }
      `}</style>
    </span>
  );
}
