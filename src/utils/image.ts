import sharp from 'sharp';

/**
 * Final JPEG quality when transcoding stored WebP proof for delivery. Telegram
 * only reliably renders JPEG as an inline photo, so screenshots are converted on
 * the way out; this is a one-off re-encode, so quality is kept high.
 */
const DELIVERY_JPEG_QUALITY = 82;

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

/** Transcode a stored screenshot (WebP) to a JPEG buffer Telegram can render inline. */
export function toDeliveryJpeg(image: Buffer): Promise<Buffer> {
  return sharp(image).jpeg({ quality: DELIVERY_JPEG_QUALITY }).toBuffer();
}
