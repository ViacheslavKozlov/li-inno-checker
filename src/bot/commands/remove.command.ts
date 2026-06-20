import type { Context, Telegraf } from 'telegraf';
import { profileService, ProfileValidationError } from '../../services/profile.service';
import { profileRepository } from '../../repositories/profile.repository';
import { escapeHtml } from '../../utils/format';
import { logger } from '../../utils/logger';
import { getCommandText } from '../command-args';
import { session } from '../session';
import { MENU_BUTTONS } from '../keyboards/main-menu.keyboard';
import {
  buildRemoveConfirmKeyboard,
  buildRemoveListKeyboard,
} from '../keyboards/remove.keyboard';

/** Show the inline list of profiles to remove (menu button and bare /remove). */
export async function handleRemovePrompt(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;
  session.clear(telegramId);

  const profiles = await profileService.list(telegramId);
  if (profiles.length === 0) {
    await ctx.reply('You have no profiles to remove. Tap ➕ Add to track one.');
    return;
  }
  await ctx.reply('Select a profile to remove:', buildRemoveListKeyboard(profiles));
}

/** `/remove <name>` removes directly; bare `/remove` shows the inline list. */
async function handleRemoveCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;

  const name = getCommandText(ctx);
  if (!name) {
    await handleRemovePrompt(ctx);
    return;
  }

  try {
    const removed = await profileService.remove(telegramId, name);
    await ctx.reply(
      `🗑 Removed <b>${escapeHtml(removed.name)}</b> and deleted its stored screenshots.`,
      { parse_mode: 'HTML' },
    );
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      await ctx.reply(`⚠️ ${escapeHtml(err.message)}`, { parse_mode: 'HTML' });
      return;
    }
    logger.error({ err, telegramId }, 'Failed to remove profile');
    await ctx.reply('Something went wrong while removing that profile. Please try again.');
  }
}

export function registerRemoveCommand(bot: Telegraf): void {
  bot.command('remove', handleRemoveCommand);
  bot.hears(MENU_BUTTONS.REMOVE, handleRemovePrompt);

  // Step 1: ask for confirmation before the destructive delete.
  bot.action(/^rm:ask:([a-f0-9]{24})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery();
    const profileId = ctx.match[1]!;
    const profile = await profileRepository.findById(profileId);
    if (!profile || profile.telegramId !== telegramId) {
      await ctx.editMessageText('That profile no longer exists.');
      return;
    }
    await ctx.editMessageText(
      `Remove <b>${escapeHtml(profile.name)}</b> and its screenshots?`,
      { parse_mode: 'HTML', ...buildRemoveConfirmKeyboard(profileId) },
    );
  });

  // Step 2: perform the delete (cascades to screenshots + history).
  bot.action(/^rm:yes:([a-f0-9]{24})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery('Removing…');
    const profileId = ctx.match[1]!;
    const profile = await profileRepository.findById(profileId);
    if (!profile || profile.telegramId !== telegramId) {
      await ctx.editMessageText('That profile no longer exists.');
      return;
    }
    try {
      await profileService.remove(telegramId, profile.name);
      await ctx.editMessageText(
        `🗑 Removed <b>${escapeHtml(profile.name)}</b> and its screenshots.`,
        { parse_mode: 'HTML' },
      );
    } catch (err) {
      logger.error({ err, telegramId }, 'Failed to remove profile via button');
      await ctx.editMessageText('Could not remove that profile.');
    }
  });

  bot.action('rm:cancel', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('Cancelled.');
  });
}
