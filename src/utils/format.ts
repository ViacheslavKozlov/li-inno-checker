import { CheckStatus } from '../types';

/** Escape text for safe interpolation into Telegram HTML-parse-mode messages. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render a Date as `YYYY-MM-DD HH:MM UTC`. */
export function formatUtc(date: Date): string {
  return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

/**
 * Render a Date against a token pattern, in UTC. Recognised tokens: `YYYY` `MM`
 * `DD` `HH` `mm` `ss`; every other character passes through literally (so e.g.
 * `YYYY-MM-DD HH:mm UTC` keeps the "UTC" suffix). Used for the screenshot
 * watermark, where the pattern is operator-configurable via env.
 */
export function formatDate(date: Date, pattern: string): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const tokens: Record<string, string> = {
    YYYY: String(date.getUTCFullYear()),
    MM: pad(date.getUTCMonth() + 1),
    DD: pad(date.getUTCDate()),
    HH: pad(date.getUTCHours()),
    mm: pad(date.getUTCMinutes()),
    ss: pad(date.getUTCSeconds()),
  };
  return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token] ?? token);
}

const STATUS_EMOJI: Record<CheckStatus, string> = {
  [CheckStatus.AVAILABLE]: '✅',
  [CheckStatus.UNAVAILABLE]: '❌',
  [CheckStatus.ERROR]: '⚠️',
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  [CheckStatus.AVAILABLE]: 'Available',
  [CheckStatus.UNAVAILABLE]: 'Unavailable',
  [CheckStatus.ERROR]: 'Error',
};

/** Human-friendly status string, e.g. "✅ Available". */
export function describeStatus(status: CheckStatus): string {
  return `${STATUS_EMOJI[status]} ${STATUS_LABEL[status]}`;
}

/** Just the status emoji, e.g. "✅" — handy for compact button labels. */
export function statusEmoji(status: CheckStatus): string {
  return STATUS_EMOJI[status];
}
