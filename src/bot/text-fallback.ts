import type { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { session } from './session';
import { processAddInput } from './commands/add.command';
import { mainMenuKeyboard } from './keyboards/main-menu.keyboard';
import { isLinkedInUrl } from '../utils/linkedin-url';

/** Looks like a paste of "<name> <linkedin-url>" the user wants to track. */
function looksLikeAdd(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.length >= 2 && isLinkedInUrl(tokens[tokens.length - 1]!);
}

/**
 * Catch-all for plain text that wasn't a command or a menu button. Registered
 * LAST so it only runs when nothing else matched. Handles the guided-add reply,
 * accepts a direct "<name> <url>" paste, and otherwise nudges to the menu.
 */
export function registerTextFallback(bot: Telegraf): void {
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    if (session.isAdd(ctx.from.id) || looksLikeAdd(text)) {
      await processAddInput(ctx, text);
      return;
    }
    await ctx.reply('Tap a button below to get started 👇', mainMenuKeyboard);
  });
}
