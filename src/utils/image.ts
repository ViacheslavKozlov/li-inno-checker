import sharp from 'sharp';
import { env } from '../config/env';

/**
 * Re-encode a lossless screenshot (the PNG Playwright captures) into a compact
 * WebP for storage. WebP is ~35% smaller than JPEG at the same perceptual
 * quality, and downscaling to `width` shrinks it further with no readability
 * loss — together roughly halving GridFS volume vs. the old JPEG. Never enlarges
 * a screenshot already narrower than `width`.
 */
export function encodeScreenshot(
  png: Buffer,
  options: { width: number; quality: number },
): Promise<Buffer> {
  return sharp(png)
    .resize({ width: options.width, withoutEnlargement: true })
    .webp({ quality: options.quality })
    .toBuffer();
}

/**
 * Transcode a stored screenshot (WebP) to a JPEG buffer Telegram can render
 * inline. A one-off re-encode on the way out, so quality is kept high
 * (`DELIVERY_JPEG_QUALITY`).
 */
export function toDeliveryJpeg(
  image: Buffer,
  quality: number = env.DELIVERY_JPEG_QUALITY,
): Promise<Buffer> {
  return sharp(image).jpeg({ quality }).toBuffer();
}
