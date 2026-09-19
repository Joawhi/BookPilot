import type { PowerupType } from "@shared/types";
import { QUIZ_SECONDS } from "@shared/constants";

export { QUIZ_SECONDS };

export function startingInventory(): Record<PowerupType, number> {
  return {
    freeze_time: 1,
    double_down: 1,
    fifty_fifty: 1,
    second_chance: 1,
    hint: 1,
  };
}

export function timedInventory(): Record<PowerupType, number> {
  return {
    freeze_time: 1,
    double_down: 1,
    fifty_fifty: 0,
    second_chance: 0,
    hint: 0,
  };
}
