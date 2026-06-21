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
