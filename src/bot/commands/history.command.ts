import type { Context, Telegraf } from 'telegraf';
import type { ProfileDocument } from '../../models/profile.model';
import { profileService } from '../../services/profile.service';
import { profileRepository } from '../../repositories/profile.repository';
import { checkRepository } from '../../repositories/check.repository';
import { env } from '../../config/env';
import { screenshotService } from '../../services/screenshot.service';
import { NotificationService } from '../../services/notification.service';
import {
  formatHistoryMonthsPrompt,
  formatHistoryShotCaption,
  formatHistoryTimeline,
  formatHistoryYearsPrompt,
} from '../../presenters/history.presenter';
import {
  buildHistoryListKeyboard,
  buildHistoryMonthsKeyboard,
  buildHistoryShotsKeyboard,
  buildHistoryYearsKeyboard,
} from '../keyboards/history.keyboard';
import { escapeHtml } from '../../utils/format';
import { getCommandText } from '../command-args';
import { logger } from '../../utils/logger';
import { session } from '../session';
import { MENU_BUTTONS } from '../keyboards/main-menu.keyboard';

/**
 * Entry point for a profile's history: show year tabs. When there's only one
 * year on record we skip straight to its month tabs (the year tab would be a
 * single pointless button) and suppress the "⬅️ Years" back row.
 */
async function showYears(ctx: Context, profile: ProfileDocument): Promise<void> {
  const years = await checkRepository.aggregateYearsByProfile(profile._id);
  if (years.length === 1) {
    await showMonths(ctx, profile, years[0]!.year, false);
    return;
  }
  await ctx.reply(formatHistoryYearsPrompt(profile, years), {
    parse_mode: 'HTML',
    ...(years.length > 0 ? buildHistoryYearsKeyboard(profile._id.toString(), years) : {}),
  });
}

/** Show the month tabs (named) within one year of a profile's history. */
async function showMonths(
  ctx: Context,
  profile: ProfileDocument,
  year: number,
  canGoBack = true,
): Promise<void> {
  const months = await checkRepository.aggregateMonthsByProfile(profile._id, year);
  if (months.length === 0) {
    await ctx.reply(formatHistoryMonthsPrompt(profile, year), { parse_mode: 'HTML' });
    return;
  }
  await ctx.reply(formatHistoryMonthsPrompt(profile, year), {
    parse_mode: 'HTML',
    ...buildHistoryMonthsKeyboard(profile._id.toString(), year, months, canGoBack),
  });
}

/** Render the dated timeline + per-screenshot buttons for one month. */
async function showMonth(
  ctx: Context,
  profile: ProfileDocument,
  year: number,
  month: number,
): Promise<void> {
  const checks = await checkRepository.findByProfileInMonth(
    profile._id,
    year,
    month,
    env.HISTORY_LIMIT,
  );
  await ctx.reply(formatHistoryTimeline(profile, year, month, checks), {
    parse_mode: 'HTML',
    ...buildHistoryShotsKeyboard(profile._id.toString(), year, checks),
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
  await showYears(ctx, profile);
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
    await showYears(ctx, profile);
  });

  bot.action(/^hist:year:([a-f0-9]{24}):(\d{4})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery();
    const profile = await profileRepository.findById(ctx.match[1]!);
    if (!profile || profile.telegramId !== telegramId) {
      await ctx.reply('That profile no longer exists.');
      return;
    }
    await showMonths(ctx, profile, Number(ctx.match[2]));
  });

  bot.action(/^hist:mon:([a-f0-9]{24}):(\d{4}):(\d{1,2})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery();
    const profile = await profileRepository.findById(ctx.match[1]!);
    if (!profile || profile.telegramId !== telegramId) {
      await ctx.reply('That profile no longer exists.');
      return;
    }
    await showMonth(ctx, profile, Number(ctx.match[2]), Number(ctx.match[3]));
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
