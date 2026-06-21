import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    // `src/config/env.ts` validates the required env at import time and calls
    // process.exit(1) when it's missing. Any unit test that imports a module
    // depending on `env` (e.g. src/utils/image.ts) would therefore abort in an
    // environment without a real .env — exactly what happens in CI. Supply
    // throwaway-but-valid values so those imports succeed; tests never touch a
    // real database or Telegram, so the values only need to pass the schema's
    // shape checks. Keeping them here (rather than in CI) also makes the suite
    // hermetic — it no longer silently depends on a developer's .env.
    env: {
      MONGODB_URI: 'mongodb://localhost:27017/li-inno-checker-test',
      TELEGRAM_BOT_TOKEN: '123456789:TEST-test_token-AA',
    },
  },
});
