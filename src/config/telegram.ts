import { Agent } from 'node:https';

/**
 * Shared HTTPS agent for all Telegram Bot API traffic — Telegraf's client and
 * the direct axios photo upload (`notification.service.ts`). Two settings:
 *
 * 1. `keepAlive: false` — a fresh connection per request, so a long-idle
 *    process (e.g. the 9am cron) never reuses a socket Telegram has since
 *    half-closed. The extra TLS handshake is negligible at this bot's traffic.
 * 2. `family: 4` — force IPv4. Harmless (Railway egress is IPv4-only by
 *    default) and keeps behaviour identical on hosts that do advertise IPv6.
 *
 * NOTE: the photo-upload timeouts were NOT an IP-family problem. The real cause
 * was Telegraf's bundled node-fetch (undici-family) stalling on large multipart
 * bodies over Railway's egress; that is fixed by sending photos over Node's
 * https stack via axios (see {@link uploadPhoto}), not by this agent.
 *
 * Shared by the long-running bot and the `run-check` CLI so both deliver the
 * same way.
 */
export const telegramAgent = new Agent({ keepAlive: false, family: 4 });

/** Pass as the `telegram` option to `new Telegraf(token, { telegram })`. */
export const telegramClientOptions = { agent: telegramAgent };
