import { Markup } from 'telegraf';
import type { ProfileDocument } from '../../models/profile.model';

/** Inline keyboard offering "Check all" plus one button per tracked profile. */
export function buildCheckKeyboard(profiles: ProfileDocument[]) {
  const rows = profiles.map((profile) => [
    Markup.button.callback(profile.name, `check:one:${profile._id.toString()}`),
  ]);
  rows.unshift([Markup.button.callback('🔄 Check all', 'check:all')]);
  return Markup.inlineKeyboard(rows);
}
