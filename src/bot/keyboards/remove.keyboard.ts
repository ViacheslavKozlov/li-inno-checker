import { Markup } from 'telegraf';
import type { ProfileDocument } from '../../models/profile.model';

/** Inline list of profiles, each tappable to begin removal. */
export function buildRemoveListKeyboard(profiles: ProfileDocument[]) {
  return Markup.inlineKeyboard(
    profiles.map((profile) => [
      Markup.button.callback(`🗑 ${profile.name}`, `rm:ask:${profile._id.toString()}`),
    ]),
  );
}

/** Yes/Cancel confirmation for a destructive removal. */
export function buildRemoveConfirmKeyboard(profileId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Yes, remove', `rm:yes:${profileId}`),
      Markup.button.callback('❌ Cancel', 'rm:cancel'),
    ],
  ]);
}
