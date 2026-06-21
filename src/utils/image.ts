import sharp from 'sharp';
import { env } from '../config/env';

const WATERMARK_FONT_SIZE = 22;
const WATERMARK_MARGIN = 14;

/** Escape text for safe interpolation into an SVG text node. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * A small SVG layer holding `label` as bottom-right white text with a black
 * outline (legible on both light and dark page backgrounds, no opaque box).
 * The canvas is sized to the label so compositing with `gravity: 'southeast'`
 * insets it a fixed margin from the corner without measuring the base image.
 */
function watermarkSvg(label: string): Buffer {
  const text = escapeXml(label);
  // Generous per-char estimate for bold sans-serif so wide custom formats fit.
  const width = Math.ceil(label.length * WATERMARK_FONT_SIZE * 0.62) + WATERMARK_MARGIN * 2;
  const height = WATERMARK_FONT_SIZE + WATERMARK_MARGIN * 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<text x="${width - WATERMARK_MARGIN}" y="${height - WATERMARK_MARGIN}" ` +
      `text-anchor="end" font-family="sans-serif" font-size="${WATERMARK_FONT_SIZE}" ` +
      `font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="3" ` +
      `paint-order="stroke" stroke-linejoin="round">${text}</text></svg>`,
  );
}

/**
 * Re-encode a lossless screenshot (the PNG Playwright captures) into a compact
 * WebP for storage. WebP is ~35% smaller than JPEG at the same perceptual
 * quality, and downscaling to `width` shrinks it further with no readability
 * loss — together roughly halving GridFS volume vs. the old JPEG. Never enlarges
 * a screenshot already narrower than `width`.
 *
 * When `label` is given it is stamped into the bottom-right corner (after the
 * downscale, so the text stays crisp) as a single composite in this same
 * pipeline — baked into the stored bytes, so it carries through to delivery and
 * history with no extra re-encode.
 */
export function encodeScreenshot(
  png: Buffer,
  options: { width: number; quality: number; label?: string },
): Promise<Buffer> {
  const pipeline = sharp(png).resize({ width: options.width, withoutEnlargement: true });
  if (options.label) {
    pipeline.composite([{ input: watermarkSvg(options.label), gravity: 'southeast' }]);
  }
  return pipeline.webp({ quality: options.quality }).toBuffer();
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
