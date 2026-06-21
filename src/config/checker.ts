import { env } from './env';
import type { CheckerOptions } from '../types';

/** Build checker options from validated environment configuration. */
export function checkerOptionsFromEnv(): CheckerOptions {
  return {
    headless: env.BROWSER_HEADLESS,
    timeoutMs: env.CHECK_TIMEOUT_MS,
    screenshotQuality: env.SCREENSHOT_QUALITY,
    screenshotWidth: env.SCREENSHOT_WIDTH,
    watermark: env.SCREENSHOT_WATERMARK,
    watermarkFormat: env.SCREENSHOT_WATERMARK_FORMAT,
    userAgent: env.BROWSER_USER_AGENT,
    viewportWidth: env.BROWSER_VIEWPORT_WIDTH,
    viewportHeight: env.BROWSER_VIEWPORT_HEIGHT,
    locale: env.BROWSER_LOCALE,
    warmupWaitMs: env.BROWSER_WARMUP_WAIT_MS,
    settleMs: env.CHECK_SETTLE_MS,
    profileReferer: env.CHECK_PROFILE_REFERER,
    homeUrl: env.LINKEDIN_HOME_URL,
    noSandbox: env.BROWSER_NO_SANDBOX,
  };
}
