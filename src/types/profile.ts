import type { CheckStatus } from './check-status';

/** A tracked LinkedIn profile owned by a user. */
export interface Profile {
  /** Owner — references User.telegramId. */
  telegramId: number;
  /** User-chosen label for this profile (unique per owner). */
  name: string;
  /** Canonical LinkedIn URL. */
  url: string;
  /** Denormalized snapshot of the most recent check, for fast /list rendering. */
  lastStatus?: CheckStatus;
  lastCheckedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProfileInput = Pick<Profile, 'telegramId' | 'name' | 'url'>;
