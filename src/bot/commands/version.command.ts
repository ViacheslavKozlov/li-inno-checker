import type { Context, Telegraf } from 'telegraf';
import { APP_VERSION } from '../../config/version';

const CHANGELOG_URL = 'https://github.com/ViacheslavKozlov/li-inno-checker/blob/main/CHANGELOG.md';

const MESSAGE = [
  `🏷️ Version <b>v${APP_VERSION}</b>`,
  '',
  `📓 <a href="${CHANGELOG_URL}">What changed</a>`,
].join('\n');

export async function handleVersion(ctx: Context): Promise<void> {
  await ctx.reply(MESSAGE, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
}

export function registerVersionCommand(bot: Telegraf): void {
  bot.command('version', handleVersion);
}
