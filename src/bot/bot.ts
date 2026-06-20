import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { userRepository } from '../repositories/user.repository';
import { registerStartCommand } from './commands/start.command';
import { registerAddCommand } from './commands/add.command';
import { registerListCommand } from './commands/list.command';
import { registerRemoveCommand } from './commands/remove.command';
import { registerCheckCommand } from './commands/check.command';
import { registerHistoryCommand } from './commands/history.command';
import { registerTextFallback } from './text-fallback';

/** Native "/" command menu shown by Telegram clients. */
const BOT_COMMANDS = [
  { command: 'start', description: 'Show the menu' },
  { command: 'list', description: 'List your profiles' },
  { command: 'check', description: 'Check profiles' },
  { command: 'add', description: 'Add a profile' },
  { command: 'remove', description: 'Remove a profile' },
  { command: 'history', description: 'Past checks + screenshot proof' },
  { command: 'help', description: 'How this bot works' },
];

/** Build a fully-wired Telegraf bot (middleware + commands + UI + error handler). */
export function createBot(): Telegraf {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  // Optional allowlist: when configured, only listed Telegram ids may interact.
  const allowed = new Set(env.ALLOWED_TELEGRAM_IDS);
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id;
    if (allowed.size > 0 && (fromId === undefined || !allowed.has(fromId))) {
      logger.warn({ fromId }, 'Blocked unauthorized user');
      if (ctx.chat) await ctx.reply('Sorry, you are not authorized to use this bot.');
      return;
    }
    return next();
  });

  // Log every user interaction: command, button press, or free text.
  bot.use(async (ctx, next) => {
    const telegramId = ctx.from?.id;
    const username = ctx.from?.username;
    let action: string | undefined;
    if (ctx.message && 'text' in ctx.message) {
      action = ctx.message.text.slice(0, 80);
    } else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      action = ctx.callbackQuery.data;
    }
    if (action !== undefined) {
      logger.info({ telegramId, username, action }, 'Bot request');
    }
    return next();
  });

  // Keep a user record current so the weekly cron knows where to deliver results.
  bot.use(async (ctx, next) => {
    if (ctx.from && ctx.chat) {
      await userRepository.upsert({
        telegramId: ctx.from.id,
        chatId: ctx.chat.id,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
      });
    }
    return next();
  });

  registerStartCommand(bot);
  registerAddCommand(bot);
  registerListCommand(bot);
  registerRemoveCommand(bot);
  registerCheckCommand(bot);
  registerHistoryCommand(bot);
  registerTextFallback(bot); // must be last — catch-all for free text

  bot.catch((err, ctx) => {
    logger.error({ err, updateType: ctx.updateType }, 'Unhandled bot error');
  });

  void bot.telegram
    .setMyCommands(BOT_COMMANDS)
    .catch((err) => logger.warn({ err }, 'Failed to set bot command menu'));

  return bot;
}
