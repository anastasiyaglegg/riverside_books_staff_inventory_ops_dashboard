// ASSUMPTION -- confirm with store owner before relying on this (CLAUDE.md, "Shared Business Logic").
export const STAMPS_PER_REWARD = 10;

export function canRedeem(currentStamps: number): boolean {
  return currentStamps >= STAMPS_PER_REWARD;
}

export function applyEarn(currentStamps: number): number {
  return currentStamps + 1;
}

export function applyRedeem(currentStamps: number): number {
  if (!canRedeem(currentStamps)) {
    throw new Error("Insufficient stamps to redeem");
  }
  return currentStamps - STAMPS_PER_REWARD;
}
