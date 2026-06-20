import type { Types } from 'mongoose';
import type { ProfileDocument } from '../models/profile.model';
import type { LinkedInChecker } from './linkedin-checker.service';
import type { CheckResult } from '../types';
import { screenshotService } from './screenshot.service';
import { checkRepository } from '../repositories/check.repository';
import { profileRepository } from '../repositories/profile.repository';
import { logger } from '../utils/logger';

export const checkService = {
  /**
   * Run one profile through the checker, persist the screenshot (GridFS) and the
   * check record, and update the profile's last-check snapshot.
   */
  async checkProfile(checker: LinkedInChecker, profile: ProfileDocument): Promise<CheckResult> {
    logger.info({ telegramId: profile.telegramId, profile: profile.name, url: profile.url }, 'Profile check: started');
    const outcome = await checker.check(profile.url);
    logger.info({ telegramId: profile.telegramId, profile: profile.name, status: outcome.status }, 'Profile check: done');
    const checkedAt = new Date();

    let screenshotFileId: Types.ObjectId | undefined;
    if (outcome.screenshot.length > 0) {
      screenshotFileId = await screenshotService.save(outcome.screenshot, {
        telegramId: profile.telegramId,
        profileName: profile.name,
        url: profile.url,
      });
    }

    await checkRepository.create({
      profileId: profile._id,
      telegramId: profile.telegramId,
      url: profile.url,
      status: outcome.status,
      screenshotFileId,
      finalUrl: outcome.finalUrl,
      title: outcome.title,
      reason: outcome.reason,
      error: outcome.error,
      checkedAt,
    });

    await profileRepository.updateLastCheck(profile._id, outcome.status, checkedAt);

    return {
      profile,
      status: outcome.status,
      finalUrl: outcome.finalUrl,
      error: outcome.error,
      screenshotFileId,
      screenshot: outcome.screenshot,
      checkedAt,
    };
  },

  /**
   * Purge a profile's entire check history and all associated GridFS
   * screenshots. Called when a profile is removed so storage is reclaimed.
   * Returns the number of check records deleted.
   */
  async deleteProfileHistory(profileId: Types.ObjectId): Promise<number> {
    const screenshotIds = await checkRepository.findScreenshotIdsByProfile(profileId);
    await Promise.all(screenshotIds.map((id) => screenshotService.delete(id)));
    return checkRepository.deleteByProfile(profileId);
  },

  /**
   * Drop checks (and their GridFS screenshots) older than `retentionDays` so
   * stored proof doesn't accumulate forever. A plain TTL index can't be used
   * here because it would orphan the screenshot bytes in GridFS; this deletes
   * both together. `retentionDays <= 0` disables pruning. Returns rows removed.
   */
  async pruneOldChecks(retentionDays: number): Promise<number> {
    if (retentionDays <= 0) return 0;
    const before = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const screenshotIds = await checkRepository.findScreenshotIdsOlderThan(before);
    await Promise.all(screenshotIds.map((id) => screenshotService.delete(id)));
    const deleted = await checkRepository.deleteOlderThan(before);
    if (deleted > 0) {
      logger.info({ deleted, screenshots: screenshotIds.length, before }, 'Pruned old checks');
    }
    return deleted;
  },
};
