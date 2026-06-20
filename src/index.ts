import { connectToDatabase, disconnectFromDatabase } from './db/connection';
import { createBot } from './bot/bot';
import { scheduleWeeklyCheck } from './jobs/weekly-check.job';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  await connectToDatabase();

  const bot = createBot();
  const weekly = scheduleWeeklyCheck(bot.telegram);

  // bot.launch() resolves only when the bot stops, so we don't await it here.
  bot.launch(() => logger.info('Bot started (long polling)')).catch((err) => {
    logger.error({ err }, 'Bot launch failed');
    process.exit(1);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down…');
    await weekly.stop();
    bot.stop(signal);
    await disconnectFromDatabase();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
