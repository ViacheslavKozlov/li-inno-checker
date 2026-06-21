import { Markup } from 'telegraf';
import type { NotificationService } from './notification.service';
import type { CheckResult } from '../types';
import { formatCheckCaption } from '../presenters/check.presenter';
import { toDeliveryJpeg } from '../utils/image';

/**
 * Deliver a completed check to a chat: the screenshot with a status caption, or
 * a plain text status when no screenshot could be captured. Shared by the
 * manual /check flow and the weekly cron so delivery stays consistent.
 */
export async function reportCheckResult(
  notifier: NotificationService,
  chatId: number,
  result: CheckResult,
): Promise<void> {
  const caption = formatCheckCaption(result);
  if (result.screenshot.length > 0) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🔗 View on LinkedIn', result.profile.url)],
    ]);
    // Stored as WebP; Telegram only renders JPEG reliably as an inline photo.
    const photo = await toDeliveryJpeg(result.screenshot);
    await notifier.sendPhoto(chatId, photo, caption, keyboard.reply_markup);
  } else {
    await notifier.sendMessage(chatId, caption);
  }
}
