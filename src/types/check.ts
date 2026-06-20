import type { Types } from 'mongoose';
import type { CheckStatus } from './check-status';
import type { Profile } from './profile';

/** Result of running the Playwright checker against a single URL. */
export interface CheckOutcome {
  status: CheckStatus;
  /** Viewport JPEG screenshot captured as proof (may be empty on hard failure). */
  screenshot: Buffer;
  /** URL the browser ended on after redirects. */
  finalUrl: string;
  /** Page <title> at capture time (kept as an audit signal). */
  title?: string;
  /** The signal the classifier matched (e.g. "http-404", "text:may not exist"). */
  reason?: string;
  /** Populated when status is ERROR. */
  error?: string;
}

/** Inputs the pure page classifier reasons over. */
export interface PageSignals {
  /** URL the browser ended on after redirects. */
  finalUrl: string;
  title: string;
  pageText: string;
  /** HTTP status of the main response, if known (0 when unknown). */
  httpStatus?: number;
}

/** Outcome of {@link classifyLinkedInPage}: a status plus the signal that decided it. */
export interface Classification {
  status: CheckStatus;
  /** Machine-readable basis for the verdict, stored on each check for auditing. */
  reason: string;
}

/**
 * One immutable record per check run — the dated proof of a profile's state.
 * `telegramId` and `url` are denormalized so the record stays self-contained
 * even if the parent profile is later removed.
 */
export interface Check {
  profileId: Types.ObjectId;
  telegramId: number;
  url: string;
  status: CheckStatus;
  /** GridFS file id of the screenshot proof (absent only on hard failures). */
  screenshotFileId?: Types.ObjectId;
  finalUrl?: string;
  /** Page <title> at capture time (audit signal). */
  title?: string;
  /** The signal the classifier matched (audit trail for the status verdict). */
  reason?: string;
  error?: string;
  checkedAt: Date;
}

export type CreateCheckInput = Omit<Check, 'checkedAt'> & { checkedAt?: Date };

/** A completed check, ready to persist and report back to the user. */
export interface CheckResult {
  profile: Profile;
  status: CheckStatus;
  finalUrl: string;
  error?: string;
  /** GridFS id of the stored proof (absent when no screenshot could be taken). */
  screenshotFileId?: Types.ObjectId;
  /** In-memory JPEG for immediate delivery, avoiding a GridFS round-trip. */
  screenshot: Buffer;
  checkedAt: Date;
}
