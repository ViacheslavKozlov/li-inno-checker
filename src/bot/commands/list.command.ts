import type { Context, Telegraf } from 'telegraf';
import { profileService } from '../../services/profile.service';
import { describeStatus, escapeHtml, formatUtc } from '../../utils/format';
import { session } from '../session';
import { MENU_BUTTONS } from '../keyboards/main-menu.keyboard';

export async function handleList(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;
  session.clear(telegramId);

  const profiles = await profileService.list(telegramId);
  if (profiles.length === 0) {
    await ctx.reply('You have no profiles yet. Tap ➕ Add to track one.');
    return;
  }

  const lines = profiles.map((profile) => {
    const status = profile.lastStatus
      ? `${describeStatus(profile.lastStatus)} · ${profile.lastCheckedAt ? formatUtc(profile.lastCheckedAt) : ''}`
      : '— not checked yet';
    return `• <b>${escapeHtml(profile.name)}</b> — ${status}\n  ${escapeHtml(profile.url)}`;
  });

  await ctx.reply(`Your profiles (${profiles.length}):\n\n${lines.join('\n\n')}`, {
    parse_mode: 'HTML',
  });
}

export function registerListCommand(bot: Telegraf): void {
  bot.command('list', handleList);
  bot.hears(MENU_BUTTONS.LIST, handleList);
}
