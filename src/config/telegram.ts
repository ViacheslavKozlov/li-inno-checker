import { Agent } from 'node:https';

/**
 * HTTPS agent for the Telegram Bot API client, tuned for the one call that
 * fails in this deployment: the multipart photo upload (`sendPhoto`). Small
 * JSON calls (`sendMessage`, `answerCbQuery`, `getUpdates`) go through; only
 * the larger upload hangs the full timeout and dies with ETIMEDOUT/ECONNRESET.
 * Two independent settings address it:
 *
 * 1. `family: 4` — force IPv4. `api.telegram.org` advertises an AAAA record,
 *    but the host's IPv6 egress to Telegram's upload path is a dead route, so
 *    the multipart POST writes into a connection that never responds. Pinning
 *    IPv4 sidesteps it. This is the fix for the history/cron screenshots that
 *    would not deliver.
 * 2. `keepAlive: false` — a fresh connection per request, so a long-idle
 *    process (e.g. the 9am cron) never reuses a socket Telegram has since
 *    half-closed. The extra TLS handshake is negligible at this bot's traffic.
 *
 * Shared by the long-running bot and the `run-check` CLI so both deliver the
 * same way.
 */
const agent = new Agent({ keepAlive: false, family: 4 });

/** Pass as the `telegram` option to `new Telegraf(token, { telegram })`. */
export const telegramClientOptions = { agent };
