import { describe, expect, it } from "vitest";
import { quizPoints, streakMultiplier, timeBonus } from "./scoring.ts";

describe("scoring", () => {
  it("gives up to 50 time bonus", () => {
    expect(timeBonus(20, 20)).toBe(50);
    expect(timeBonus(0, 20)).toBe(0);
    expect(timeBonus(10, 20)).toBe(25);
  });

  it("applies streak multipliers at 3 and 5", () => {
    expect(streakMultiplier(2)).toBe(1);
    expect(streakMultiplier(3)).toBe(1.5);
    expect(streakMultiplier(5)).toBe(2);
  });

  it("scores a fast correct answer with streak", () => {
    const pts = quizPoints({
      correct: true,
      secondsLeft: 20,
      doubleDown: false,
      secondChanceRetry: false,
      streakAfter: 3,
      hintUsed: false,
    });
    expect(pts).toBe(Math.round((100 + 50) * 1.5));
  });

  it("double down and second chance stack as specified", () => {
    const pts = quizPoints({
      correct: true,
      secondsLeft: 0,
      doubleDown: true,
      secondChanceRetry: true,
      streakAfter: 1,
      hintUsed: false,
    });
    expect(pts).toBe(Math.round(100 * 2 * 0.5));
  });

  it("hint subtracts 25 even on a miss", () => {
    expect(
      quizPoints({
        correct: false,
        secondsLeft: 5,
        doubleDown: false,
        secondChanceRetry: false,
        streakAfter: 0,
        hintUsed: true,
      }),
    ).toBe(-25);
  });
});
