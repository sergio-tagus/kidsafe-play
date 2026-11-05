/** Minutes added by one "Extend 1 hour" press. */
export const EXTEND_MINUTES = 60;

/** Today's limit = the child's daily limit + any extra time the parent granted today. */
export function effectiveLimit(dailyLimit: number, bonusMinutes: number): number {
  return Math.max(0, dailyLimit) + Math.max(0, bonusMinutes);
}

/** New bonus after one extension. */
export function extendBonus(currentBonus: number): number {
  return Math.max(0, currentBonus) + EXTEND_MINUTES;
}
