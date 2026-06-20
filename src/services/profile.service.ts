import { profileRepository } from '../repositories/profile.repository';
import type { ProfileDocument } from '../models/profile.model';
import { normalizeLinkedInUrl } from '../utils/linkedin-url';
import { checkService } from './check.service';
import { logger } from '../utils/logger';

/** Thrown for user-correctable input problems; the message is safe to show. */
export class ProfileValidationError extends Error {}

const MAX_NAME_LENGTH = 60;
const MAX_PROFILES_PER_USER = 50;

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export const profileService = {
  /** Validate input, enforce per-user uniqueness/limits, and persist a profile. */
  async add(telegramId: number, rawName: string, rawUrl: string): Promise<ProfileDocument> {
    const name = rawName.trim();
    if (!name) throw new ProfileValidationError('Please provide a name for the profile.');
    if (name.length > MAX_NAME_LENGTH) {
      throw new ProfileValidationError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
    }

    const url = normalizeLinkedInUrl(rawUrl);
    if (!url) {
      throw new ProfileValidationError(
        'That does not look like a LinkedIn profile URL. Example: https://www.linkedin.com/in/username',
      );
    }

    if (await profileRepository.findByUserAndName(telegramId, name)) {
      throw new ProfileValidationError(`You already have a profile named "${name}".`);
    }

    if ((await profileRepository.countByUser(telegramId)) >= MAX_PROFILES_PER_USER) {
      throw new ProfileValidationError(
        `You have reached the limit of ${MAX_PROFILES_PER_USER} profiles.`,
      );
    }

    try {
      const profile = await profileRepository.create({ telegramId, name, url });
      logger.info({ telegramId, name, url: profile.url }, 'Profile added');
      return profile;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ProfileValidationError(`You already have a profile named "${name}".`);
      }
      throw err;
    }
  },

  list(telegramId: number): Promise<ProfileDocument[]> {
    return profileRepository.findByUser(telegramId);
  },

  async remove(telegramId: number, rawName: string): Promise<ProfileDocument> {
    const name = rawName.trim();
    const removed = await profileRepository.deleteByUserAndName(telegramId, name);
    if (!removed) {
      throw new ProfileValidationError(`No profile named "${name}" was found.`);
    }
    // Reclaim storage: drop the profile's check history and its GridFS screenshots.
    const deleted = await checkService.deleteProfileHistory(removed._id);
    logger.info({ telegramId, name, deleted }, 'Removed profile and purged its history');
    return removed;
  },
};
