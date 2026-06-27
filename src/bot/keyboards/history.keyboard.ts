import { Markup } from 'telegraf';
import type { CheckDocument } from '../../models/check.model';
import type { ProfileDocument } from '../../models/profile.model';
import { formatUtc, monthName, statusEmoji } from '../../utils/format';

/** Inline list of profiles, each tappable to open its check history. */
export function buildHistoryListKeyboard(profiles: ProfileDocument[]) {
  return Markup.inlineKeyboard(
    profiles.map((profile) => [
      Markup.button.callback(`📜 ${profile.name}`, `hist:one:${profile._id.toString()}`),
    ]),
  );
}

/** Year tabs (newest first) for a profile's history, each with its check count. */
export function buildHistoryYearsKeyboard(
  profileId: string,
  years: { year: number; count: number }[],
) {
  return Markup.inlineKeyboard(
    years.map(({ year, count }) => [
      Markup.button.callback(`📅 ${year} (${count})`, `hist:year:${profileId}:${year}`),
    ]),
  );
}

/**
 * Month tabs (named, newest first) within one year, each with its check count.
 * A trailing "⬅️ Years" row returns to the year tabs unless `canGoBack` is false
 * (e.g. there is only one year, so the year level was skipped).
 */
export function buildHistoryMonthsKeyboard(
  profileId: string,
  year: number,
  months: { month: number; count: number }[],
  canGoBack = true,
) {
  const rows = months.map(({ month, count }) => [
    Markup.button.callback(
      `🗓️ ${monthName(month)} (${count})`,
      `hist:mon:${profileId}:${year}:${month}`,
    ),
  ]);
  if (canGoBack) {
    rows.push([Markup.button.callback('⬅️ Years', `hist:one:${profileId}`)]);
  }
  return Markup.inlineKeyboard(rows);
}

/**
 * One button per stored screenshot (dated) within a month, letting the user pull
 * back the proof for any check. Checks without a screenshot are omitted. A
 * trailing "⬅️ Months" row returns to the month tabs for that year.
 */
export function buildHistoryShotsKeyboard(
  profileId: string,
  year: number,
  checks: CheckDocument[],
) {
  const rows = checks
    .filter((check) => check.screenshotFileId)
    .map((check) => [
      Markup.button.callback(
        `${statusEmoji(check.status)} ${formatUtc(check.checkedAt)}`,
        `hist:shot:${check._id.toString()}`,
      ),
    ]);
  rows.push([Markup.button.callback('⬅️ Months', `hist:year:${profileId}:${year}`)]);
  return Markup.inlineKeyboard(rows);
}
