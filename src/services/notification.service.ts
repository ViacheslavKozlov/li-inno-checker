import { Input, type Telegram } from 'telegraf';
import type { Readable } from 'node:stream';

/** Thin wrapper over Telegraf's Telegram client used by the bot and the cron job. */
export class NotificationService {
  constructor(private readonly telegram: Telegram) {}

  async sendMessage(chatId: number, text: string): Promise<void> {
    await this.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  async sendPhoto(chatId: number, photo: Buffer | Readable, caption?: string): Promise<void> {
    const media = Buffer.isBuffer(photo) ? Input.fromBuffer(photo) : Input.fromReadableStream(photo);
    await this.telegram.sendPhoto(chatId, media, caption ? { caption, parse_mode: 'HTML' } : {});
  }
}
