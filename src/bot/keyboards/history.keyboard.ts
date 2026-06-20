import { Markup } from 'telegraf';
import type { CheckDocument } from '../../models/check.model';
import type { ProfileDocument } from '../../models/profile.model';
import { formatUtc, statusEmoji } from '../../utils/format';

/** Inline list of profiles, each tappable to open its check history. */
export function buildHistoryListKeyboard(profiles: ProfileDocument[]) {
  return Markup.inlineKeyboard(
    profiles.map((profile) => [
      Markup.button.callback(`📜 ${profile.name}`, `hist:one:${profile._id.toString()}`),
    ]),
  );
}

/**
 * One button per stored screenshot (dated), letting the user pull back the
 * proof for any recent check. Checks without a screenshot are omitted.
 */
export function buildHistoryDetailKeyboard(checks: CheckDocument[]) {
  const rows = checks
    .filter((check) => check.screenshotFileId)
    .map((check) => [
      Markup.button.callback(
        `${statusEmoji(check.status)} ${formatUtc(check.checkedAt)}`,
        `hist:shot:${check._id.toString()}`,
      ),
    ]);
  return Markup.inlineKeyboard(rows);
}
