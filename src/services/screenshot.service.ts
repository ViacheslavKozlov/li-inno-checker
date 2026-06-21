import type { Types } from 'mongoose';
import { deleteScreenshot, readScreenshot, saveScreenshot } from '../db/gridfs';
import { toDeliveryJpeg } from '../utils/image';
import type { ScreenshotMeta } from '../types';

function buildFilename(meta: ScreenshotMeta): string {
  const safeName = meta.profileName.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40) || 'profile';
  return `${meta.telegramId}_${safeName}_${Date.now()}.webp`;
}

export const screenshotService = {
  /** Persist a WebP buffer to GridFS and return its file id. */
  save(buffer: Buffer, meta: ScreenshotMeta): Promise<Types.ObjectId> {
    return saveScreenshot(buffer, buildFilename(meta), {
      ...meta,
      contentType: 'image/webp',
      capturedAt: new Date().toISOString(),
    });
  },

  /**
   * Read a stored screenshot and transcode it to a JPEG buffer for delivery,
   * since Telegram only reliably renders JPEG as an inline photo.
   */
  async readForDelivery(id: Types.ObjectId): Promise<Buffer> {
    return toDeliveryJpeg(await readScreenshot(id));
  },

  delete(id: Types.ObjectId): Promise<void> {
    return deleteScreenshot(id);
  },
};
