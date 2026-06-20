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
};
