import type { Context, Telegraf } from 'telegraf';
import { mainMenuKeyboard, MENU_BUTTONS } from '../keyboards/main-menu.keyboard';
import { session } from '../session';

const HELP = [
  '👋 I check whether LinkedIn profiles are <b>available</b> and keep dated screenshot proof of each check.',
  '',
  'Use the buttons below 👇 — or these commands:',
  '/add &lt;name&gt; &lt;url&gt; — track a LinkedIn profile',
  '/list — show your tracked profiles',
  '/check — check all profiles, or pick one',
  '/history &lt;name&gt; — past checks + screenshot proof',
  '/remove &lt;name&gt; — stop tracking (also deletes its screenshots)',
  '',
  'ℹ️ I also re-check everything automatically once a week.',
].join('\n');

export async function handleHelp(ctx: Context): Promise<void> {
  if (ctx.from) session.clear(ctx.from.id);
  await ctx.reply(HELP, { parse_mode: 'HTML', ...mainMenuKeyboard });
}

export function registerStartCommand(bot: Telegraf): void {
  bot.start(handleHelp);
  bot.help(handleHelp);
  bot.hears(MENU_BUTTONS.HELP, handleHelp);
}
