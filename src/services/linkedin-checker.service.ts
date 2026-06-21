import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { CheckStatus, type CheckOutcome, type CheckerOptions } from '../types';
import { logger } from '../utils/logger';
import { encodeScreenshot } from '../utils/image';
import { formatDate } from '../utils/format';
import { classifyLinkedInPage } from './linkedin-classifier';

// Strip the most obvious automation tells before any page script runs.
const STEALTH_INIT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
`;

// Launch flags that make headless Chromium present like a normal browser.
const LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
];

// Extra flags required to launch Chromium inside a container: the sandbox can't
// run as root, and the default 64MB /dev/shm makes Chromium crash under load.
const CONTAINER_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];

/**
 * Opens LinkedIn URLs anonymously with a single shared browser, taking a
 * compact viewport screenshot of each and classifying the page state. Each
 * check runs in its own incognito context so cookies/state never leak between
 * profiles.
 */
export class LinkedInChecker {
  private browser: Browser | null = null;
  /** Guest cookies captured once so profiles get the normal interstitial, not the bare join wall. */
  private guestState: Awaited<ReturnType<BrowserContext['storageState']>> | undefined;

  constructor(private readonly options: CheckerOptions) {}

  async launch(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: this.options.noSandbox ? [...LAUNCH_ARGS, ...CONTAINER_ARGS] : LAUNCH_ARGS,
    });
    await this.warmUpGuestSession();
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browser = null;
    this.guestState = undefined;
  }

  /**
   * Visit the LinkedIn homepage once to collect guest cookies (bcookie/lidc…).
   * Reusing these across checks makes anonymous requests look like a returning
   * browser, so LinkedIn serves the normal "may be private" / profile page
   * instead of redirecting to the stripped-down authwall. Best-effort.
   */
  private async warmUpGuestSession(): Promise<void> {
    if (!this.browser) return;
    const context = await this.newBrowserContext();
    try {
      const page = await context.newPage();
      await page.goto(this.options.homeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeoutMs,
      });
      await page.waitForTimeout(this.options.warmupWaitMs);
      this.guestState = await context.storageState();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message }, 'LinkedIn guest warmup failed; continuing without it');
    } finally {
      await context.close();
    }
  }

  private newBrowserContext(): Promise<BrowserContext> {
    if (!this.browser) throw new Error('Checker is not launched; call launch() first.');
    return this.browser.newContext({
      userAgent: this.options.userAgent,
      viewport: { width: this.options.viewportWidth, height: this.options.viewportHeight },
      locale: this.options.locale,
      // Force English regardless of the host's geo-IP.
      extraHTTPHeaders: { 'Accept-Language': `${this.options.locale},en;q=0.9` },
      ...(this.guestState ? { storageState: this.guestState } : {}),
    });
  }

  async check(url: string): Promise<CheckOutcome> {
    if (!this.browser) throw new Error('Checker is not launched; call launch() first.');

    const context = await this.newBrowserContext();
    await context.addInitScript(STEALTH_INIT);
    const page = await context.newPage();

    logger.info({ url }, 'LinkedIn check: fetching');
    const t0 = Date.now();

    try {
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeoutMs,
        referer: this.options.profileReferer,
      });
      await page.waitForTimeout(this.options.settleMs);

      // A single viewport capture is enough to show the state (available / gone);
      // it's stored as a downscaled WebP to keep GridFS volume/cost low.
      const screenshot = await this.capture(page);
      const finalUrl = page.url();
      const [title, pageText] = await Promise.all([
        page.title().catch(() => ''),
        page.innerText('body').catch(() => ''),
      ]);

      const httpStatus = response?.status() ?? 0;
      const { status, reason } = classifyLinkedInPage({ finalUrl, title, pageText, httpStatus });

      logger.info(
        { url, finalUrl, status, reason, httpStatus, ms: Date.now() - t0 },
        'LinkedIn check: done',
      );
      return { status, screenshot, finalUrl, title, reason };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      let screenshot: Buffer = Buffer.alloc(0);
      try {
        screenshot = await this.capture(page);
      } catch {
        // page may be unusable after a navigation failure; proof simply unavailable
      }
      logger.warn({ url, err: message, ms: Date.now() - t0 }, 'LinkedIn check: error');
      return { status: CheckStatus.ERROR, screenshot, finalUrl: page.url(), error: message };
    } finally {
      await context.close();
    }
  }

  /**
   * Capture the viewport as a lossless PNG, then re-encode it to a compact,
   * downscaled WebP (via sharp) for storage. Encoding off the source PNG avoids
   * the double-compression of capturing JPEG and transcoding. The capture time
   * is stamped on as a watermark in the same pass when enabled.
   */
  private async capture(page: Page): Promise<Buffer> {
    const png = await page.screenshot({ fullPage: false, type: 'png' });
    return encodeScreenshot(png, {
      width: this.options.screenshotWidth,
      quality: this.options.screenshotQuality,
      label: this.options.watermark
        ? formatDate(new Date(), this.options.watermarkFormat)
        : undefined,
    });
  }
}

/** Launch a checker, run `fn`, and always close the browser afterwards. */
export async function withChecker<T>(
  options: CheckerOptions,
  fn: (checker: LinkedInChecker) => Promise<T>,
): Promise<T> {
  const checker = new LinkedInChecker(options);
  await checker.launch();
  try {
    return await fn(checker);
  } finally {
    await checker.close();
  }
}
