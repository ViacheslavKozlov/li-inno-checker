/**
 * Tiny in-memory per-user conversation state. Tracks whether a user is mid
 * "add a profile" flow (awaiting a name + URL) and whether they currently have
 * a check running (used to reject overlapping /check requests). Transient by
 * design — losing it on restart just means the user re-taps a button.
 */
const awaitingAdd = new Set<number>();
const checking = new Set<number>();

export const session = {
  setAdd(telegramId: number): void {
    awaitingAdd.add(telegramId);
  },
  isAdd(telegramId: number): boolean {
    return awaitingAdd.has(telegramId);
  },
  clear(telegramId: number): void {
    awaitingAdd.delete(telegramId);
  },

  /** True if a check is already in flight for this user. */
  isChecking(telegramId: number): boolean {
    return checking.has(telegramId);
  },
  setChecking(telegramId: number): void {
    checking.add(telegramId);
  },
  clearChecking(telegramId: number): void {
    checking.delete(telegramId);
  },
};
