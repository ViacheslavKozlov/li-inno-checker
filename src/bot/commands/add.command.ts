import type { Context, Telegraf } from 'telegraf';
import { profileService, ProfileValidationError } from '../../services/profile.service';
import { escapeHtml } from '../../utils/format';
import { logger } from '../../utils/logger';
import { getCommandText } from '../command-args';
import { session } from '../session';
import { MENU_BUTTONS } from '../keyboards/main-menu.keyboard';

const ADD_PROMPT =
  '📎 Send the profile as <b>name</b> then <b>URL</b>:\n' +
  '<code>John https://www.linkedin.com/in/johndoe</code>';

/** Begin the guided add flow: ask for input and mark the user as "awaiting add". */
export async function handleAddPrompt(ctx: Context): Promise<void> {
  if (ctx.from) session.setAdd(ctx.from.id);
  await ctx.reply(ADD_PROMPT, { parse_mode: 'HTML' });
}

/** Parse "<name> <url>" and persist it. Clears the awaiting-add flag. */
export async function processAddInput(ctx: Context, rawText: string): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;
  session.clear(telegramId);

  // The URL is the final token; everything before it is the (possibly multi-word) name.
  const tokens = rawText.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) {
    await ctx.reply(`⚠️ I need a name and a URL.\n\n${ADD_PROMPT}`, { parse_mode: 'HTML' });
    return;
  }
  const url = tokens[tokens.length - 1]!;
  const name = tokens.slice(0, -1).join(' ');

  try {
    const profile = await profileService.add(telegramId, name, url);
    await ctx.reply(
      `✅ Added <b>${escapeHtml(profile.name)}</b>\n🔗 ${escapeHtml(profile.url)}\n\nTap 🔍 Check to check it now.`,
      { parse_mode: 'HTML' },
    );
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      await ctx.reply(`⚠️ ${escapeHtml(err.message)}`, { parse_mode: 'HTML' });
      return;
    }
    logger.error({ err, telegramId }, 'Failed to add profile');
    await ctx.reply('Something went wrong while adding that profile. Please try again.');
  }
}

async function handleAddCommand(ctx: Context): Promise<void> {
  const text = getCommandText(ctx);
  if (!text) {
    await handleAddPrompt(ctx);
    return;
  }
  await processAddInput(ctx, text);
}

export function registerAddCommand(bot: Telegraf): void {
  bot.command('add', handleAddCommand);
  bot.hears(MENU_BUTTONS.ADD, handleAddPrompt);
}
