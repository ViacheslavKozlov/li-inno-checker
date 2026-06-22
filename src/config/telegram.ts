import { Agent } from 'node:https';

/**
 * Telegraf keeps Bot API sockets alive and reuses them by default
 * (`https.Agent` with `keepAlive: true`). The weekly cron fires after the
 * process has sat idle, so its first photo upload reuses a socket Telegram has
 * since half-closed: the multipart POST writes into a dead connection, gets no
 * response, and dies with ECONNRESET ~60s later — while small `sendMessage`
 * calls and freshly-warmed manual checks still succeed. Using a fresh
 * connection per request sidesteps the stale-socket reuse; the extra TLS
 * handshake is negligible at this bot's traffic. Shared by the long-running
 * bot and the `run-check` CLI so both deliver the same way.
 */
const agent = new Agent({ keepAlive: false });

/** Pass as the `telegram` option to `new Telegraf(token, { telegram })`. */
export const telegramClientOptions = { agent };
