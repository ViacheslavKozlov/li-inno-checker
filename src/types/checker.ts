/** Runtime options for the Playwright-based LinkedIn checker. */
export interface CheckerOptions {
  headless: boolean;
  timeoutMs: number;
  /** JPEG quality 1-100 for the stored screenshot (lower = smaller files). */
  screenshotQuality: number;
}
