import { describeStatus, escapeHtml, formatUtc } from '../utils/format';
import type { CheckDocument } from '../models/check.model';
import type { ProfileDocument } from '../models/profile.model';

/**
 * Build the HTML timeline for a profile's recent checks. Each line is a dated
 * status; the screenshots themselves are fetched on demand via the keyboard.
 */
export function formatHistoryTimeline(profile: ProfileDocument, checks: CheckDocument[]): string {
  const header = `📜 <b>${escapeHtml(profile.name)}</b>`;
  if (checks.length === 0) {
    return `${header}\n\nNo checks recorded yet. Tap 🔍 Check to run one.`;
  }

  const lines = checks.map((check) => {
    const proof = check.screenshotFileId ? '' : ' (no screenshot)';
    return `• ${formatUtc(check.checkedAt)} — ${describeStatus(check.status)}${proof}`;
  });

  return [
    `${header} — last ${checks.length} check(s):`,
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
