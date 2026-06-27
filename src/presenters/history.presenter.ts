import { describeStatus, escapeHtml, formatUtc, monthName } from '../utils/format';
import type { CheckDocument } from '../models/check.model';
import type { ProfileDocument } from '../models/profile.model';

/** Prompt shown above the year tabs for a profile. */
export function formatHistoryYearsPrompt(
  profile: ProfileDocument,
  years: { year: number; count: number }[],
): string {
  const header = `📜 <b>${escapeHtml(profile.name)}</b>`;
  if (years.length === 0) {
    return `${header}\n\nNo checks recorded yet. Tap 🔍 Check to run one.`;
  }
  const total = years.reduce((sum, { count }) => sum + count, 0);
  return `${header} — ${total} check(s) on record.\n\nPick a year:`;
}

/** Prompt shown above the month tabs within one year. */
export function formatHistoryMonthsPrompt(profile: ProfileDocument, year: number): string {
  return `📜 <b>${escapeHtml(profile.name)}</b> · ${year}\n\nPick a month:`;
}

/**
 * Build the HTML timeline for one month's checks. Each line is a dated status;
 * the screenshots themselves are fetched on demand via the keyboard.
 */
export function formatHistoryTimeline(
  profile: ProfileDocument,
  year: number,
  month: number,
  checks: CheckDocument[],
): string {
  const header = `📜 <b>${escapeHtml(profile.name)}</b> · ${monthName(month)} ${year}`;
  if (checks.length === 0) {
    return `${header}\n\nNo checks recorded for this month.`;
  }

  const lines = checks.map((check) => {
    const proof = check.screenshotFileId ? '' : ' (no screenshot)';
    return `• ${formatUtc(check.checkedAt)} — ${describeStatus(check.status)}${proof}`;
  });

  return [
    `${header} — ${checks.length} check(s):`,
    '',
    ...lines,
    '',
    'Tap a date below to see the stored screenshot proof.',
  ].join('\n');
}

/** Compact caption shown above a single retrieved screenshot. */
export function formatHistoryShotCaption(check: CheckDocument): string {
  const lines = [
    `${describeStatus(check.status)} · ${formatUtc(check.checkedAt)}`,
    `🔗 ${escapeHtml(check.url)}`,
  ];
  if (check.error) lines.push(`⚠️ ${escapeHtml(check.error)}`);
  return lines.join('\n');
}
