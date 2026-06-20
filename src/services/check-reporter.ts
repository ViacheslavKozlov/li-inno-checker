import type { NotificationService } from './notification.service';
import type { CheckResult } from '../types';
import { formatCheckCaption } from '../presenters/check.presenter';

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
    await notifier.sendPhoto(chatId, result.screenshot, caption);
  } else {
    await notifier.sendMessage(chatId, caption);
  }
}
