import { CheckStatus } from '../types';

/** Escape text for safe interpolation into Telegram HTML-parse-mode messages. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Render a Date as `YYYY-MM-DD HH:MM UTC`. */
export function formatUtc(date: Date): string {
  return `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
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
