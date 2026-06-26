import { Input, type Telegram } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';
import type { Readable } from 'node:stream';
import { sleep } from '../utils/concurrency';
import { logger } from '../utils/logger';

// Telegram's photo upload (a multipart POST) is the call that fails in
// practice — it hangs and dies with ETIMEDOUT/ECONNRESET while small JSON calls
// (sendMessage) go through. The root cause (IPv6 upload route) is fixed by the
// IPv4 agent in config/telegram.ts; this layer is the safety net: Telegraf does
// not retry, so without it a transient blip silently drops the result. We bound
// a hung send with a timeout and retry both flood control (429) and transient
// network errors a few times.
const MAX_RETRIES = 2;
const SEND_TIMEOUT_MS = 30_000;
const FLOOD_BUFFER_MS = 500;
const MAX_BACKOFF_MS = 8_000;

const TRANSIENT_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ENETUNREACH',
  'EAI_AGAIN',
]);

/** Rejected by {@link withTimeout} when a Telegram call overruns; retry-able. */
class SendTimeoutError extends Error {
  readonly code = 'ETIMEDOUT';
  constructor() {
    super(`Telegram request exceeded ${SEND_TIMEOUT_MS}ms`);
    this.name = 'SendTimeoutError';
  }
}

/** Telegram's flood-control wait (ms) from a 429, or `null` if not a 429. */
function floodWaitMs(err: unknown): number | null {
  if (typeof err !== 'object' || err === null) return null;
  const e = err as {
    code?: number | string;
    parameters?: { retry_after?: number };
    response?: { error_code?: number; parameters?: { retry_after?: number } };
  };
  const code = e.code ?? e.response?.error_code;
  if (code !== 429) return null;
  const retryAfter = e.parameters?.retry_after ?? e.response?.parameters?.retry_after ?? 1;
  return retryAfter * 1000;
}

/** A network blip (reset/timeout/etc.) worth retrying, vs. a real API rejection. */
function isTransientNetworkError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: number | string; message?: string };
  if (typeof e.code === 'string' && TRANSIENT_CODES.has(e.code)) return true;
  return typeof e.message === 'string' && /socket hang up|network timeout/i.test(e.message);
}

/**
 * How long to wait before retrying `err` on attempt `attempt`, or `null` to
 * give up. Flood control uses the wait the API asks for; transient network
 * errors back off exponentially (capped).
 */
function retryDelayMs(err: unknown, attempt: number): number | null {
  const flood = floodWaitMs(err);
  if (flood !== null) return flood + FLOOD_BUFFER_MS;
  if (isTransientNetworkError(err)) return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
  return null;
}

/** Thin wrapper over Telegraf's Telegram client used by the bot and the cron job. */
export class NotificationService {
  constructor(private readonly telegram: Telegram) {}

  async sendMessage(chatId: number, text: string): Promise<void> {
    await this.send(() => this.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' }));
  }

  async sendPhoto(
    chatId: number,
    photo: Buffer | Readable,
    caption?: string,
    replyMarkup?: InlineKeyboardMarkup,
  ): Promise<void> {
    const media = Buffer.isBuffer(photo) ? Input.fromBuffer(photo) : Input.fromReadableStream(photo);
    await this.send(() =>
      this.telegram.sendPhoto(chatId, media, {
        ...(caption ? { caption, parse_mode: 'HTML' } : {}),
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    );
  }

  /**
   * Run a Telegram API call with a timeout, retrying flood control and
   * transient network errors. Callers always send in-memory buffers, so a
   * retried `sendPhoto` re-sends the same bytes safely.
   */
  private async send<T>(op: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await withTimeout(op());
      } catch (err) {
        const delay = retryDelayMs(err, attempt);
        if (delay === null || attempt >= MAX_RETRIES) throw err;
        logger.warn(
          { attempt: attempt + 1, delay, reason: errReason(err) },
          'Telegram send failed — retrying',
        );
        await sleep(delay);
      }
    }
  }
}

/**
 * Resolve/reject with `op`, but reject with {@link SendTimeoutError} if it
 * overruns. The abandoned call's eventual rejection is swallowed so it can't
 * surface as an unhandledRejection after we've moved on.
 */
function withTimeout<T>(op: Promise<T>): Promise<T> {
  op.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SendTimeoutError()), SEND_TIMEOUT_MS);
  });
  return Promise.race([op, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** A short, log-friendly description of a send failure. */
function errReason(err: unknown): string {
  if (typeof err !== 'object' || err === null) return String(err);
  const e = err as { code?: number | string; message?: string };
  return e.code !== undefined ? `${e.code}` : (e.message ?? 'unknown');
}
