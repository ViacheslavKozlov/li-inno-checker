import { describeStatus, escapeHtml, formatUtc } from '../utils/format';
import { CheckStatus, type CheckResult } from '../types';

/** Build the Telegram photo caption (HTML) for a completed check. */
export function formatCheckCaption(result: CheckResult): string {
  const lines = [
    `<b>${escapeHtml(result.profile.name)}</b> — ${describeStatus(result.status)}`,
    `🔗 ${escapeHtml(result.profile.url)}`,
    `🕓 ${formatUtc(result.checkedAt)}`,
  ];
  if (result.error) lines.push(`⚠️ ${escapeHtml(result.error)}`);
  return lines.join('\n');
}

/** Per-status counts tallied over a multi-profile run. */
export type CheckTally = Record<CheckStatus, number>;

/** A fresh zeroed tally. */
export function emptyTally(): CheckTally {
  return {
    [CheckStatus.AVAILABLE]: 0,
    [CheckStatus.UNAVAILABLE]: 0,
    [CheckStatus.ERROR]: 0,
  };
}

/** Compact one-line status breakdown, e.g. "✅ 2 available · ❌ 1 unavailable · ⚠️ 0 error". */
export function formatTally(tally: CheckTally): string {
  return (
    `✅ ${tally[CheckStatus.AVAILABLE]} available · ` +
    `❌ ${tally[CheckStatus.UNAVAILABLE]} unavailable · ` +
    `⚠️ ${tally[CheckStatus.ERROR]} error`
  );
}

/** The proactive "weekly check finished" summary (HTML) delivered by the cron. */
export function formatWeeklySummary(total: number, tally: CheckTally, completedAt: Date): string {
  return [
    `🗓️ <b>Weekly check complete</b> — ${total} profile(s)`,
    formatTally(tally),
    `🕓 ${formatUtc(completedAt)}`,
  ].join('\n');
}
