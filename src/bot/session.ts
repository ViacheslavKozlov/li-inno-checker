/**
 * Tiny in-memory per-user conversation state. Only tracks whether a user is
 * mid "add a profile" flow (awaiting a name + URL). Transient by design —
 * losing it on restart just means the user re-taps ➕ Add.
 */
const awaitingAdd = new Set<number>();

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
};
