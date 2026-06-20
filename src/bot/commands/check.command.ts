import type { Context, Telegraf } from 'telegraf';
import type { ProfileDocument } from '../../models/profile.model';
import { profileService } from '../../services/profile.service';
import { profileRepository } from '../../repositories/profile.repository';
import { checkService } from '../../services/check.service';
import { withChecker } from '../../services/linkedin-checker.service';
import { checkerOptionsFromEnv } from '../../config/checker';
import { NotificationService } from '../../services/notification.service';
import { reportCheckResult } from '../../services/check-reporter';
import { buildCheckKeyboard } from '../keyboards/check.keyboard';
import { getCommandText } from '../command-args';
import { escapeHtml } from '../../utils/format';
import { logger } from '../../utils/logger';
import { session } from '../session';
import { MENU_BUTTONS } from '../keyboards/main-menu.keyboard';

/** Run the given profiles through the checker and deliver each result to the chat. */
async function runChecks(ctx: Context, profiles: ProfileDocument[]): Promise<void> {
  const chatId = ctx.chat?.id ?? ctx.from?.id;
  if (chatId === undefined) return;

  const notifier = new NotificationService(ctx.telegram);
  await ctx.reply(`⏳ Checking ${profiles.length} profile(s)…`);

  await withChecker(checkerOptionsFromEnv(), async (checker) => {
    for (const profile of profiles) {
      try {
        const result = await checkService.checkProfile(checker, profile);
        await reportCheckResult(notifier, chatId, result);
      } catch (err) {
        logger.error({ err, profile: profile.name }, 'Check failed');
        await notifier.sendMessage(chatId, `⚠️ Failed to check "${escapeHtml(profile.name)}".`);
      }
    }
  });
}

/** Show the "check all / pick one" keyboard (menu button and bare /check). */
async function showCheckMenu(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;
  session.clear(telegramId);

  const profiles = await profileService.list(telegramId);
  if (profiles.length === 0) {
    await ctx.reply('You have no profiles yet. Tap ➕ Add to track one.');
    return;
  }
  await ctx.reply('Which profile do you want to check?', buildCheckKeyboard(profiles));
}

/** `/check` — optionally `/check <name>` to check a single profile directly. */
async function handleCheckCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  if (telegramId === undefined) return;

  const requested = getCommandText(ctx);
  if (!requested) {
    await showCheckMenu(ctx);
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
  await runChecks(ctx, [profile]);
}

export function registerCheckCommand(bot: Telegraf): void {
  bot.command('check', handleCheckCommand);
  bot.hears(MENU_BUTTONS.CHECK, showCheckMenu);

  bot.action('check:all', async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery('Checking all…');
    await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
    const profiles = await profileService.list(telegramId);
    if (profiles.length > 0) await runChecks(ctx, profiles);
  });

  bot.action(/^check:one:([a-f0-9]{24})$/, async (ctx) => {
    const telegramId = ctx.from?.id;
    if (telegramId === undefined) return;
    await ctx.answerCbQuery('Checking…');
    await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);

    const profileId = ctx.match[1]!;
    const profile = await profileRepository.findById(profileId);
    if (!profile || profile.telegramId !== telegramId) {
      await ctx.reply('That profile no longer exists.');
      return;
    }
    await runChecks(ctx, [profile]);
  });
}
