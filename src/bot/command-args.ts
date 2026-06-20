import type { Context } from 'telegraf';

/** Text following a `/command` (everything after the first whitespace), trimmed. */
export function getCommandText(ctx: Context): string {
  const message = ctx.message;
  if (message && 'text' in message) {
    const spaceIndex = message.text.indexOf(' ');
    return spaceIndex === -1 ? '' : message.text.slice(spaceIndex + 1).trim();
  }
  return '';
}
