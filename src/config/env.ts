import 'dotenv/config';
import { z } from 'zod';
import { validate as isValidCron } from 'node-cron';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

const idListFromString = z.string().transform((value) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(Number)
    .filter((id) => Number.isFinite(id)),
);

// Optional integer that tolerates an empty string (`KEY=`) as "not set".
const optionalInt = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined),
  z.coerce.number().int().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Required infrastructure
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .regex(/^mongodb(\+srv)?:\/\/.+/, 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),
  TELEGRAM_BOT_TOKEN: z
    .string()
    .min(1, 'TELEGRAM_BOT_TOKEN is required')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'TELEGRAM_BOT_TOKEN must look like "123456789:AA...".'),

  // Optional, unused in multi-user mode but validated when present.
  TELEGRAM_CHAT_ID: optionalInt,

  // Scheduler / checker tuning (all optional with sane defaults)
  CRON_SCHEDULE: z
    .string()
    .default('0 9 * * 1')
    .refine((value) => isValidCron(value), 'CRON_SCHEDULE is not a valid cron expression'),
  BROWSER_HEADLESS: booleanFromString.default(true),
  // Launch Chromium with --no-sandbox/--disable-dev-shm-usage. Needed when the
  // process runs as root in a container (Docker/Railway); leave false locally.
  BROWSER_NO_SANDBOX: booleanFromString.default(false),
  CHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  CHECK_CONCURRENCY: z.coerce.number().int().positive().default(2),
  CHECK_DELAY_MS: z.coerce.number().int().nonnegative().default(3_000),
  // Process-wide cap on simultaneous on-demand /check runs (each launches its
  // own Chromium). Guards memory when many users check at once.
  MANUAL_CHECK_CONCURRENCY: z.coerce.number().int().positive().default(2),
  // Delete stored checks + their screenshots older than this many days, so
  // GridFS doesn't grow without bound. Set 0 to keep history forever.
  CHECK_RETENTION_DAYS: z.coerce.number().int().nonnegative().default(365),
  // WebP quality for stored screenshots (lower = smaller files / less storage).
  SCREENSHOT_QUALITY: z.coerce.number().int().min(1).max(100).default(60),
  // Width (px) stored screenshots are downscaled to before encoding. 1024 keeps
  // a LinkedIn page fully legible while shrinking files vs. the 1280 viewport.
  SCREENSHOT_WIDTH: z.coerce.number().int().positive().default(1024),
  // JPEG quality when transcoding stored WebP proof for Telegram delivery.
  DELIVERY_JPEG_QUALITY: z.coerce.number().int().min(1).max(100).default(82),
  // Stamp the capture date onto each stored screenshot. Baked into the WebP, so
  // it carries through to delivery + history for free. Set false to store
  // unmarked proof.
  SCREENSHOT_WATERMARK: booleanFromString.default(true),
  // Date pattern for the watermark. Tokens (rendered in UTC): YYYY MM DD HH mm
  // ss; any other characters are literal. Default → e.g. "2026-06-21 14:30 UTC".
  SCREENSHOT_WATERMARK_FORMAT: z.string().min(1).default('YYYY-MM-DD HH:mm UTC'),

  // Browser fingerprint: present as a real, current desktop Chrome. Bump the UA
  // as Chrome advances; it must NOT contain "HeadlessChrome" or LinkedIn bounces
  // the visit to the bare join wall.
  BROWSER_USER_AGENT: z
    .string()
    .min(1)
    .default(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ),
  BROWSER_VIEWPORT_WIDTH: z.coerce.number().int().positive().default(1280),
  BROWSER_VIEWPORT_HEIGHT: z.coerce.number().int().positive().default(900),
  // Locale (and derived Accept-Language) forced on every context so geo-IP can't
  // switch LinkedIn out of English.
  BROWSER_LOCALE: z.string().min(2).default('en-US'),
  // Dwell on the homepage while guest cookies warm up (ms).
  BROWSER_WARMUP_WAIT_MS: z.coerce.number().int().nonnegative().default(1500),
  // Settle time after a profile navigation before capture + classify (ms).
  CHECK_SETTLE_MS: z.coerce.number().int().nonnegative().default(2500),
  // Referer sent with profile visits; arriving "from Google" is the normal
  // public-profile path (without it LinkedIn bounces to the bare join wall).
  CHECK_PROFILE_REFERER: z
    .string()
    .regex(/^https?:\/\/.+/, 'CHECK_PROFILE_REFERER must be an http(s) URL')
    .default('https://www.google.com/'),
  // LinkedIn homepage, visited once per run to collect guest cookies.
  LINKEDIN_HOME_URL: z
    .string()
    .regex(/^https?:\/\/.+/, 'LINKEDIN_HOME_URL must be an http(s) URL')
    .default('https://www.linkedin.com/'),

  // How many recent checks a /history view lists.
  HISTORY_LIMIT: z.coerce.number().int().positive().default(10),
  // Per-user caps enforced when adding a profile.
  MAX_PROFILES_PER_USER: z.coerce.number().int().positive().default(50),
  MAX_PROFILE_NAME_LENGTH: z.coerce.number().int().positive().default(60),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Optional access control: empty => bot is open to everyone.
  ALLOWED_TELEGRAM_IDS: idListFromString.default([]),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    // Logger depends on env, so fall back to console here.
    console.error(`Invalid environment configuration:\n${details}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
