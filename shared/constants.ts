/** Shared constants. Import from both client and server. */

export const APP_NAME = "BookPilot";
export const MAX_PDFS_PER_UPLOAD = 5;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const QUIZ_QUESTION_COUNT = 10;
export const QUIZ_SECONDS = 20;
export const QUIZ_BASE_POINTS = 100;
export const QUIZ_MAX_TIME_BONUS = 50;
export const STREAK_X15 = 3;
export const STREAK_X2 = 5;
export const POWERUP_EVERY_STREAK = 5;
export const HINT_COST = 25;
export const FREEZE_SECONDS = 10;

export const GAME_TYPES = [
  "quiz",
  "match_pairs",
  "fill_blank",
  "true_false",
  "sequence_sort",
] as const;

export type GameType = (typeof GAME_TYPES)[number];

export const MINIGAME_TYPES = [
  "match_pairs",
  "fill_blank",
  "true_false",
  "sequence_sort",
] as const;

export type MinigameType = (typeof MINIGAME_TYPES)[number];

export const POWERUP_TYPES = [
  "freeze_time",
  "double_down",
  "fifty_fifty",
  "second_chance",
  "hint",
] as const;

export type PowerupType = (typeof POWERUP_TYPES)[number];

export const PALETTE = {
  cream: "#F4E8D0",
  paper: "#FBF3E3",
  ink: "#2B2118",
  beet: "#C44536",
  sunflower: "#E8B923",
  leaf: "#3D6B3A",
  deepBlue: "#1E3A5F",
  plum: "#7B3B4A",
} as const;
