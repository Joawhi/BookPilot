import {
  FREEZE_SECONDS,
  HINT_COST,
  QUIZ_BASE_POINTS,
  QUIZ_MAX_TIME_BONUS,
  QUIZ_SECONDS,
  STREAK_X15,
  STREAK_X2,
} from "../../../shared/constants.ts";
import type { PowerupType } from "../../../shared/constants.ts";

export function timeBonus(secondsLeft: number, maxSeconds = QUIZ_SECONDS) {
  const clamped = Math.max(0, Math.min(maxSeconds, secondsLeft));
  return Math.round((clamped / maxSeconds) * QUIZ_MAX_TIME_BONUS);
}

export function streakMultiplier(streakIncludingThisCorrect: number) {
  if (streakIncludingThisCorrect >= STREAK_X2) return 2;
  if (streakIncludingThisCorrect >= STREAK_X15) return 1.5;
  return 1;
}

export function quizPoints(opts: {
  correct: boolean;
  secondsLeft: number;
  doubleDown: boolean;
  secondChanceRetry: boolean;
  streakAfter: number;
  hintUsed: boolean;
}) {
  if (!opts.correct) return opts.hintUsed ? -HINT_COST : 0;
  let score = QUIZ_BASE_POINTS + timeBonus(opts.secondsLeft);
  score *= streakMultiplier(opts.streakAfter);
  if (opts.doubleDown) score *= 2;
  if (opts.secondChanceRetry) score *= 0.5;
  if (opts.hintUsed) score -= HINT_COST;
  return Math.round(score);
}

export function minigamePoints(opts: {
  correct: boolean;
  secondsLeft: number;
  maxSeconds: number;
  streakAfter: number;
  doubleDown: boolean;
  base?: number;
}) {
  if (!opts.correct) return 0;
  const base = opts.base ?? 80;
  const bonus = Math.round((Math.max(0, opts.secondsLeft) / opts.maxSeconds) * 40);
  let score = (base + bonus) * streakMultiplier(opts.streakAfter);
  if (opts.doubleDown) score *= 2;
  return Math.round(score);
}

export const freezeSeconds = FREEZE_SECONDS;

export function startingPowerups(): Record<PowerupType, number> {
  return {
    freeze_time: 1,
    double_down: 1,
    fifty_fifty: 1,
    second_chance: 1,
    hint: 1,
  };
}

export function randomPowerup(): PowerupType {
  const all: PowerupType[] = ["freeze_time", "double_down", "fifty_fifty", "second_chance", "hint"];
  return all[Math.floor(Math.random() * all.length)]!;
}
