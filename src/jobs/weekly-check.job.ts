import { schedule, validate, type ScheduledTask } from 'node-cron';
import cronstrue from 'cronstrue';
import type { Telegram } from 'telegraf';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { ProfileDocument } from '../models/profile.model';
import { profileRepository } from '../repositories/profile.repository';
import { userRepository } from '../repositories/user.repository';
import { checkService } from '../services/check.service';
import { withChecker } from '../services/linkedin-checker.service';
import { checkerOptionsFromEnv } from '../config/checker';
import { NotificationService } from '../services/notification.service';
import { reportCheckResult } from '../services/check-reporter';
import { CheckStatus } from '../types';
import { emptyTally, formatWeeklySummary, type CheckTally } from '../presenters/check.presenter';
import { escapeHtml } from '../utils/format';
import { mapWithConcurrency } from '../utils/concurrency';

/**
 * Check every tracked profile across all users with one shared browser, store
 * each result + screenshot, and deliver a photo per profile to its owner.
 * Each user is bookended with a "running…" heads-up and a tallied summary so
 * the run is visible even if an individual delivery (or the whole pass) is
 * dropped. Reused by both the weekly schedule and the `run-check` CLI.
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

  // findAll() sorts by telegramId, but group explicitly so per-user bookends
  // don't depend on that ordering. Each user gets one heads-up and one summary.
  const profilesByUser = new Map<number, ProfileDocument[]>();
  for (const profile of profiles) {
    const owned = profilesByUser.get(profile.telegramId);
    if (owned) owned.push(profile);
    else profilesByUser.set(profile.telegramId, [profile]);
  }
  const chatIdFor = (telegramId: number): number => chatIdByUser.get(telegramId) ?? telegramId;
  const tallies = new Map<number, CheckTally>(
    [...profilesByUser.keys()].map((telegramId) => [telegramId, emptyTally()]),
  );

  logger.info(
    { profiles: profiles.length, users: profilesByUser.size },
    'Check pass: starting',
  );

  // Proactive heads-up per user before any work — also the first signal that
  // delivery to this chat works at all on the scheduled run.
  for (const [telegramId, owned] of profilesByUser) {
    await notifier
      .sendMessage(chatIdFor(telegramId), `🗓️ Running your weekly check — ${owned.length} profile(s)…`)
      .catch((err) => logger.error({ err, telegramId }, 'Check pass: heads-up failed'));
  }

  await withChecker(checkerOptionsFromEnv(), async (checker) => {
    await mapWithConcurrency(
      profiles,
      env.CHECK_CONCURRENCY,
      async (profile) => {
        const chatId = chatIdFor(profile.telegramId);
        const tally = tallies.get(profile.telegramId)!;
        try {
          const result = await checkService.checkProfile(checker, profile);
          tally[result.status] += 1;
          // A delivery failure must not be counted as a check error — the check
          // itself succeeded — but it must still be visible, not just logged.
          await reportCheckResult(notifier, chatId, result).catch((err) => {
            logger.error(
              { err, profile: profile.name, telegramId: profile.telegramId },
              'Check pass: result delivery failed',
            );
          });
        } catch (err) {
          tally[CheckStatus.ERROR] += 1;
          logger.error(
            { err, profile: profile.name, telegramId: profile.telegramId },
            'Check pass: profile failed',
          );
          await notifier
            .sendMessage(chatId, `⚠️ Failed to check "${escapeHtml(profile.name)}".`)
            .catch(() => undefined);
        }
      },
      env.CHECK_DELAY_MS,
    );
  });

  // Proactive summary per user so the run is unmistakable even on an all-green week.
  const completedAt = new Date();
  for (const [telegramId, owned] of profilesByUser) {
    await notifier
      .sendMessage(chatIdFor(telegramId), formatWeeklySummary(owned.length, tallies.get(telegramId)!, completedAt))
      .catch((err) => logger.error({ err, telegramId }, 'Check pass: summary failed'));
  }

  // Reclaim storage from aged-out proof (best-effort; never fail the pass).
  await checkService
    .pruneOldChecks(env.CHECK_RETENTION_DAYS)
    .catch((err) => logger.error({ err }, 'Check pass: prune failed'));

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
