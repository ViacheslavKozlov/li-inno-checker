import { schedule, validate, type ScheduledTask } from 'node-cron';
import cronstrue from 'cronstrue';
import type { Telegram } from 'telegraf';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { profileRepository } from '../repositories/profile.repository';
import { userRepository } from '../repositories/user.repository';
import { checkService } from '../services/check.service';
import { withChecker } from '../services/linkedin-checker.service';
import { checkerOptionsFromEnv } from '../config/checker';
import { NotificationService } from '../services/notification.service';
import { reportCheckResult } from '../services/check-reporter';
import { mapWithConcurrency } from '../utils/concurrency';

/**
 * Check every tracked profile across all users with one shared browser, store
 * each result + screenshot, and deliver a photo per profile to its owner.
 * Reused by both the weekly schedule and the `run-check` CLI.
 */
export async function runCheckPass(telegram: Telegram): Promise<void> {
  const profiles = await profileRepository.findAll();
  if (profiles.length === 0) {
    logger.info('Check pass: no profiles to check');
    return;
  }

  const users = await userRepository.findAll();
  const chatIdByUser = new Map(users.map((user) => [user.telegramId, user.chatId]));
  const notifier = new NotificationService(telegram);

  logger.info({ profiles: profiles.length }, 'Check pass: starting');

  await withChecker(checkerOptionsFromEnv(), async (checker) => {
    await mapWithConcurrency(
      profiles,
      env.CHECK_CONCURRENCY,
      async (profile) => {
        const chatId = chatIdByUser.get(profile.telegramId) ?? profile.telegramId;
        try {
          const result = await checkService.checkProfile(checker, profile);
          await reportCheckResult(notifier, chatId, result);
        } catch (err) {
          logger.error(
            { err, profile: profile.name, telegramId: profile.telegramId },
            'Check pass: profile failed',
          );
        }
      },
      env.CHECK_DELAY_MS,
    );
  });

  logger.info('Check pass: completed');
}

/** Register the recurring weekly check on the in-process scheduler. */
export function scheduleWeeklyCheck(telegram: Telegram): ScheduledTask {
  if (!validate(env.CRON_SCHEDULE)) {
    throw new Error(`Invalid CRON_SCHEDULE expression: "${env.CRON_SCHEDULE}"`);
  }
  const task = schedule(env.CRON_SCHEDULE, () => {
    logger.info('Weekly check triggered by schedule');
    return runCheckPass(telegram).catch((err) =>
      logger.error({ err }, 'Weekly check pass crashed'),
    );
  });
  logger.info(`Weekly check scheduled: ${cronstrue.toString(env.CRON_SCHEDULE)}`);
  return task;
}
