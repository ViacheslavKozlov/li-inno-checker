/**
 * A counting semaphore that bounds how many async operations run at once.
 * Used to cap concurrent headless-browser launches across the whole process so
 * a burst of manual /check requests can't exhaust memory (each launch is a full
 * Chromium). FIFO: waiters are released in the order they queued.
 */
export class Semaphore {
  private available: number;
  private readonly waiters: Array<() => void> = [];

  constructor(max: number) {
    this.available = Math.max(1, Math.floor(max));
  }

  private async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) next();
    else this.available++;
  }

  /** Run `fn` once a slot is free, always releasing the slot afterwards. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
