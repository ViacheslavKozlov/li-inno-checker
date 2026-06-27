import type { Telegram } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';
import type { Readable } from 'node:stream';
import axios, { isAxiosError } from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';
import { telegramAgent } from '../config/telegram';
import { sleep } from '../utils/concurrency';
import { logger } from '../utils/logger';

// Telegram's photo upload (a multipart POST) is the call that fails in
// practice — it hangs and dies with ETIMEDOUT while small JSON calls
// (sendMessage) go through. On Railway's egress, Telegraf's bundled node-fetch
// (undici-family) stalls on large outbound bodies; the documented workaround is
// to send those over Node's https stack instead, so `sendPhoto` posts the
// multipart form directly with axios (see {@link uploadPhoto}). This layer is
// the safety net: we bound a hung send with a timeout and retry both flood
// control (429) and transient network errors a few times.
const MAX_RETRIES = 2;
const SEND_TIMEOUT_MS = 30_000;
const FLOOD_BUFFER_MS = 500;
const MAX_BACKOFF_MS = 8_000;
const TELEGRAM_API_ROOT = 'https://api.telegram.org';

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

/** A Telegram API error body, as returned in a non-`ok` response. */
interface TelegramErrorBody {
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

/**
 * Shape a Telegram API error so {@link retryDelayMs} can read it: `code` mirrors
 * `error_code` (so a 429 triggers flood-control backoff) and `parameters`
 * carries `retry_after`.
 */
function telegramApiError(data?: TelegramErrorBody): Error {
  const e = new Error(data?.description ?? `Telegram API error ${data?.error_code ?? 'unknown'}`) as Error & {
    code?: number;
    parameters?: { retry_after?: number };
    response?: { error_code?: number; parameters?: { retry_after?: number } };
  };
  e.code = data?.error_code;
  e.parameters = data?.parameters;
  e.response = { error_code: data?.error_code, parameters: data?.parameters };
  return e;
}

/** Normalize an axios failure into the shape {@link retryDelayMs} understands. */
function normalizeUploadError(err: unknown): Error {
  if (isAxiosError(err)) {
    const data = err.response?.data as TelegramErrorBody | undefined;
    if (data?.error_code) return telegramApiError(data);
    // A network blip or axios' own request-abort timeout (ECONNABORTED).
    const e = new Error(err.message) as Error & { code?: string };
    e.code = err.code === 'ECONNABORTED' ? 'ETIMEDOUT' : err.code;
    return e;
  }
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * Upload a photo via a direct axios multipart POST to the Bot API instead of
 * Telegraf's bundled node-fetch. On Railway's egress, fetch/undici stalls on
 * large outbound bodies (small JSON calls go through; photo uploads hang and
 * ETIMEDOUT), whereas axios uses Node's https stack — the known-good path.
 * Reuses the shared IPv4 / keep-alive-off agent. Its own `timeout` aborts a
 * hung request so no socket leaks; errors are normalized for the retry wrapper.
 */
async function uploadPhoto(
  chatId: number,
  photo: Buffer | Readable,
  caption?: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<void> {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
  }
  if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
  form.append('photo', photo, { filename: 'screenshot.jpg', contentType: 'image/jpeg' });

  try {
    const res = await axios.post<{ ok: boolean } & TelegramErrorBody>(
      `${TELEGRAM_API_ROOT}/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
      form,
      {
        headers: form.getHeaders(),
        httpsAgent: telegramAgent,
        timeout: SEND_TIMEOUT_MS,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );
    if (!res.data?.ok) throw telegramApiError(res.data);
  } catch (err) {
    throw normalizeUploadError(err);
  }
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
    await this.send(() => uploadPhoto(chatId, photo, caption, replyMarkup));
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
