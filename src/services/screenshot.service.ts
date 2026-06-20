import type { Types } from 'mongoose';
import type { Readable } from 'node:stream';
import { deleteScreenshot, openScreenshotStream, saveScreenshot } from '../db/gridfs';
import type { ScreenshotMeta } from '../types';

function buildFilename(meta: ScreenshotMeta): string {
  const safeName = meta.profileName.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'profile';
  return `${meta.telegramId}_${safeName}_${Date.now()}.jpg`;
}

export const screenshotService = {
  /** Persist a JPEG buffer to GridFS and return its file id. */
  save(buffer: Buffer, meta: ScreenshotMeta): Promise<Types.ObjectId> {
    return saveScreenshot(buffer, buildFilename(meta), {
      ...meta,
      contentType: 'image/jpeg',
      capturedAt: new Date().toISOString(),
    });
  },

  /** Stream a stored screenshot back (e.g. to pipe into Telegram sendPhoto). */
  openStream(id: Types.ObjectId): Readable {
    return openScreenshotStream(id);
  },

  delete(id: Types.ObjectId): Promise<void> {
    return deleteScreenshot(id);
  },
};
