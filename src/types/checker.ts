/** Runtime options for the Playwright-based LinkedIn checker. */
export interface CheckerOptions {
  headless: boolean;
  timeoutMs: number;
  /** WebP quality 1-100 for the stored screenshot (lower = smaller files). */
  screenshotQuality: number;
  /** Width (px) the stored screenshot is downscaled to; smaller = cheaper storage. */
  screenshotWidth: number;
  /** Desktop Chrome User-Agent presented to LinkedIn (must not be "HeadlessChrome"). */
  userAgent: string;
  /** Browser viewport captured for the screenshot. */
  viewportWidth: number;
  viewportHeight: number;
  /** Locale forced on each context (also drives the Accept-Language header). */
  locale: string;
  /** Dwell on the homepage while guest cookies warm up (ms). */
  warmupWaitMs: number;
  /** Settle time after a profile navigation before capture/classify (ms). */
  settleMs: number;
  /** Referer sent with profile navigations (the "from Google" path). */
  profileReferer: string;
  /** LinkedIn homepage visited once to collect guest cookies. */
  homeUrl: string;
  /**
   * Add Chromium's container flags (`--no-sandbox`, `--disable-dev-shm-usage`).
   * Required when running as root in Docker (e.g. the Railway image) or where
   * `/dev/shm` is tiny; harmless but unnecessary for normal local runs.
   */
  noSandbox: boolean;
}
