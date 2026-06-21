/** Runtime options for the Playwright-based LinkedIn checker. */
export interface CheckerOptions {
  headless: boolean;
  timeoutMs: number;
  /** WebP quality 1-100 for the stored screenshot (lower = smaller files). */
  screenshotQuality: number;
  /** Width (px) the stored screenshot is downscaled to; smaller = cheaper storage. */
  screenshotWidth: number;
  /**
   * Add Chromium's container flags (`--no-sandbox`, `--disable-dev-shm-usage`).
   * Required when running as root in Docker (e.g. the Railway image) or where
   * `/dev/shm` is tiny; harmless but unnecessary for normal local runs.
   */
  noSandbox: boolean;
}
