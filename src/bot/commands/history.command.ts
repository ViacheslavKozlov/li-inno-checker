import type { Context, Telegraf } from 'telegraf';
import type { ProfileDocument } from '../../models/profile.model';
import { profileService } from '../../services/profile.service';
import { profileRepository } from '../../repositories/profile.repository';
import { checkRepository } from '../../repositories/check.repository';
import { env } from '../../config/env';
import { screenshotService } from '../../services/screenshot.service';
import { NotificationService } from '../../services/notification.service';
import {
  formatHistoryShotCaption,
  formatHistoryTimeline,
} from '../../presenters/history.presenter';
import {
  buildHistoryDetailKeyboard,
  buildHistoryListKeyboard,
} from '../keyboards/history.keyboard';
import { escapeHtml } from '../../utils/format';
import { getCommandText } from '../command-args';
import { logger } from '../../utils/logger';
import { session } from '../session';
import { MENU_BUTTONS } from '../keyboards/main-menu.keyboard';

/** Render the dated timeline + per-screenshot buttons for one profile. */
async function showProfileHistory(ctx: Context, profile: ProfileDocument): Promise<void> {
  const checks = await checkRepository.findByProfile(profile._id, env.HISTORY_LIMIT);
  // Only attach the screenshot keyboard when there's at least one to fetch —
  // Telegram rejects an inline keyboard with no buttons.
  const hasShots = checks.some((check) => check.screenshotFileId);
  await ctx.reply(formatHistoryTimeline(profile, checks), {
    parse_mode: 'HTML',
    ...(hasShots ? buildHistoryDetailKeyboard(checks) : {}),
  });
}

/** Show the inline list of profiles to inspect (menu button and bare /history). */
export async function handleHistoryPrompt(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;
  session.clear(telegramId);

  const profiles = await profileService.list(telegramId);
  if (profiles.length === 0) {
    await ctx.reply('You have no profiles yet. Tap ➕ Add to track one.');
    return;
  }
  await ctx.reply('Whose history do you want to see?', buildHistoryListKeyboard(profiles));
}

/** `/history <name>` opens one profile directly; bare `/history` shows the list. */
async function handleHistoryCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;

  const requested = getCommandText(ctx);
  if (!requested) {
    await handleHistoryPrompt(ctx);
    return;
  }

  const profiles = await profileService.list(telegramId);
  const profile = profiles.find((p) => p.name.toLowerCase() === requested.toLowerCase());
  if (!profile) {
    await ctx.reply(`No profile named "${escapeHtml(requested)}". Use 📋 My Profiles to see them.`, {
      parse_mode: 'HTML',
    });
    return;
  }
  await showProfileHistory(ctx, profile);
}

export function registerHistoryCommand(bot: Telegraf): void {
  bot.command('history', handleHistoryCommand);
  bot.hears(MENU_BUTTONS.HISTORY, handleHistoryPrompt);

  bot.action(/^hist:one:([a-f0-9]{24})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery();
    const profile = await profileRepository.findById(ctx.match[1]!);
    if (!profile || profile.telegramId !== telegramId) {
      await ctx.reply('That profile no longer exists.');
      return;
    }
    await showProfileHistory(ctx, profile);
  });

  bot.action(/^hist:shot:([a-f0-9]{24})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    const chatId = ctx.chat?.id ?? telegramId;
    if (telegramId === undefined || chatId === undefined) return;
    await ctx.answerCbQuery('Fetching proof…');

    const check = await checkRepository.findById(ctx.match[1]!);
    // Verify ownership and that proof still exists before streaming from GridFS.
    if (!check || check.telegramId !== telegramId || !check.screenshotFileId) {
      await ctx.reply('That screenshot is no longer available.');
      return;
    }

    const notifier = new NotificationService(ctx.telegram);
    try {
      const photo = await screenshotService.readForDelivery(check.screenshotFileId);
      await notifier.sendPhoto(chatId, photo, formatHistoryShotCaption(check));
    } catch (err) {
      logger.error({ err, checkId: check._id.toString() }, 'Failed to send stored screenshot');
      await ctx.reply('Could not load that screenshot — it may have been purged.');
    }
  });
}
