import { Telegraf } from 'telegraf';
import { env } from '../config/env';
import { telegramClientOptions } from '../config/telegram';
import { logger } from '../utils/logger';
import { connectToDatabase, disconnectFromDatabase } from '../db/connection';
import { runCheckPass } from '../jobs/weekly-check.job';

/**
 * One-shot check pass for manual runs or an external (system) cron.
 * Connects to the DB, runs every profile once, delivers results, then exits.
 */
async function main(): Promise<void> {
  await connectToDatabase();
  const telegram = new Telegraf(env.TELEGRAM_BOT_TOKEN, { telegram: telegramClientOptions }).telegram;
  try {
    await runCheckPass(telegram);
  } finally {
    await disconnectFromDatabase();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'run-check failed');
    process.exit(1);
  });
