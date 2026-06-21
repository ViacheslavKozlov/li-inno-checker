import { env } from './env';
import type { CheckerOptions } from '../types';

/** Build checker options from validated environment configuration. */
export function checkerOptionsFromEnv(): CheckerOptions {
  return {
    headless: env.BROWSER_HEADLESS,
    timeoutMs: env.CHECK_TIMEOUT_MS,
    screenshotQuality: env.SCREENSHOT_QUALITY,
    screenshotWidth: env.SCREENSHOT_WIDTH,
    noSandbox: env.BROWSER_NO_SANDBOX,
  };
}
