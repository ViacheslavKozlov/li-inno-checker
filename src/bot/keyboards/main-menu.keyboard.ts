import { Markup } from 'telegraf';

/** Labels for the persistent reply keyboard; also matched by `bot.hears`. */
export const MENU_BUTTONS = {
  LIST: '📋 My Profiles',
  CHECK: '🔍 Check',
  ADD: '➕ Add',
  REMOVE: '🗑 Remove',
  HELP: '❓ Help',
} as const;

/** The always-visible bottom menu shown after /start. */
export const mainMenuKeyboard = Markup.keyboard([
  [MENU_BUTTONS.LIST, MENU_BUTTONS.CHECK],
  [MENU_BUTTONS.ADD, MENU_BUTTONS.REMOVE],
  [MENU_BUTTONS.HELP],
]).resize();
