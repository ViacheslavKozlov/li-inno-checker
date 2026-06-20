import mongoose, { Types } from 'mongoose';
import type { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';

const BUCKET_NAME = 'screenshots';

function getBucket(): GridFSBucket {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database is not connected; GridFS is unavailable.');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

// mongoose's Types.ObjectId and the driver's ObjectId are the same bson class at
// runtime; these helpers bridge the two distinct TS declarations in one place.
const toDriverId = (id: Types.ObjectId): ObjectId => id as unknown as ObjectId;

/** Store a PNG buffer in GridFS and resolve with its file id. */
export function saveScreenshot(
  buffer: Buffer,
  filename: string,
  metadata?: Record<string, unknown>,
): Promise<Types.ObjectId> {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id as unknown as Types.ObjectId));
  });
}

/** Open a readable stream for a stored screenshot (suitable for Telegram sendPhoto). */
export function openScreenshotStream(id: Types.ObjectId): Readable {
  return getBucket().openDownloadStream(toDriverId(id));
}

/** Remove a stored screenshot; ignores files that are already gone. */
export async function deleteScreenshot(id: Types.ObjectId): Promise<void> {
  try {
    await getBucket().delete(toDriverId(id));
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return;
    throw err;
  }
}
