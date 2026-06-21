import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { encodeScreenshot, toDeliveryJpeg } from './image';

/** A representative source: a 1280x900 PNG, the size the checker captures. */
async function sourcePng(): Promise<Buffer> {
  return sharp({
    create: { width: 1280, height: 900, channels: 3, background: { r: 245, g: 246, b: 248 } },
  })
    .png()
    .toBuffer();
}

describe('encodeScreenshot', () => {
  it('produces a WebP downscaled to the requested width', async () => {
    const out = await encodeScreenshot(await sourcePng(), { width: 1024, quality: 60 });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1024);
  });

  it('does not enlarge a screenshot already narrower than the target width', async () => {
    const narrow = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    const meta = await sharp(await encodeScreenshot(narrow, { width: 1024, quality: 60 })).metadata();
    expect(meta.width).toBe(800);
  });

  it('keeps format and dimensions when a watermark label is composited', async () => {
    const out = await encodeScreenshot(await sourcePng(), {
      width: 1024,
      quality: 60,
      label: '2026-06-21 14:30 UTC',
    });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(1024);
  });

  it('changes the encoded bytes when a label is present', async () => {
    const src = await sourcePng();
    const plain = await encodeScreenshot(src, { width: 1024, quality: 60 });
    const marked = await encodeScreenshot(src, { width: 1024, quality: 60, label: '2026-06-21' });
    expect(marked.equals(plain)).toBe(false);
  });
});

describe('toDeliveryJpeg', () => {
  it('transcodes a stored WebP screenshot to JPEG for Telegram', async () => {
    const webp = await encodeScreenshot(await sourcePng(), { width: 1024, quality: 60 });
    const meta = await sharp(await toDeliveryJpeg(webp)).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1024);
  });
});
