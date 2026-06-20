import { describeStatus, escapeHtml, formatUtc } from '../utils/format';
import type { CheckResult } from '../types';

/** Build the Telegram photo caption (HTML) for a completed check. */
export function formatCheckCaption(result: CheckResult): string {
  const lines = [
    `<b>${escapeHtml(result.profile.name)}</b> — ${describeStatus(result.status)}`,
    `🔗 ${escapeHtml(result.profile.url)}`,
    `🕓 ${formatUtc(result.checkedAt)}`,
  ];
  if (result.error) lines.push(`⚠️ ${escapeHtml(result.error)}`);
  return lines.join('\n');
}
