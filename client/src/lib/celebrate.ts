import confetti from "canvas-confetti";
import { PALETTE } from "@shared/constants";

export function celebrate(kind: "streak" | "win" = "streak") {
  const colors = [PALETTE.beet, PALETTE.sunflower, PALETTE.leaf, PALETTE.deepBlue];
  confetti({
    particleCount: kind === "win" ? 160 : 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    scalar: 0.9,
  });
  if (kind === "win") {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
  }
}
