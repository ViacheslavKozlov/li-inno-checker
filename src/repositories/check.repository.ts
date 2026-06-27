import { Types } from 'mongoose';
import { CheckModel, type CheckDocument } from '../models/check.model';
import type { CreateCheckInput } from '../types';

export const checkRepository = {
  create(input: CreateCheckInput): Promise<CheckDocument> {
    return CheckModel.create(input);
  },

  findById(id: Types.ObjectId | string): Promise<CheckDocument | null> {
    return CheckModel.findById(id).exec();
  },

  findLatestByProfile(profileId: Types.ObjectId): Promise<CheckDocument | null> {
    return CheckModel.findOne({ profileId }).sort({ checkedAt: -1 }).exec();
  },

  findByProfile(profileId: Types.ObjectId, limit = 10): Promise<CheckDocument[]> {
    return CheckModel.find({ profileId }).sort({ checkedAt: -1 }).limit(limit).exec();
  },

  /** Checks for a profile within a single UTC calendar month, newest first. */
  findByProfileInMonth(
    profileId: Types.ObjectId,
    year: number,
    month: number,
    limit = 100,
  ): Promise<CheckDocument[]> {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return CheckModel.find({ profileId, checkedAt: { $gte: start, $lt: end } })
      .sort({ checkedAt: -1 })
      .limit(limit)
      .exec();
  },

  /** Distinct UTC years that have checks for a profile, newest first, with counts. */
  async aggregateYearsByProfile(
    profileId: Types.ObjectId,
  ): Promise<{ year: number; count: number }[]> {
    const rows = await CheckModel.aggregate<{ _id: number; count: number }>([
      { $match: { profileId } },
      { $group: { _id: { $year: { date: '$checkedAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]).exec();
    return rows.map((row) => ({ year: row._id, count: row.count }));
  },

  /** UTC months (1-12) with checks for a profile in a given year, newest first, with counts. */
  async aggregateMonthsByProfile(
    profileId: Types.ObjectId,
    year: number,
  ): Promise<{ month: number; count: number }[]> {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const rows = await CheckModel.aggregate<{ _id: number; count: number }>([
      { $match: { profileId, checkedAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: { date: '$checkedAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]).exec();
    return rows.map((row) => ({ month: row._id, count: row.count }));
  },

  /** Screenshot file ids for a profile's checks (used to purge GridFS on delete). */
  async findScreenshotIdsByProfile(profileId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const docs = await CheckModel.find(
      { profileId, screenshotFileId: { $exists: true } },
      { screenshotFileId: 1 },
    )
      .lean()
      .exec();
    return docs
      .map((doc) => doc.screenshotFileId)
      .filter((id): id is Types.ObjectId => Boolean(id));
  },

  async deleteByProfile(profileId: Types.ObjectId): Promise<number> {
    const result = await CheckModel.deleteMany({ profileId }).exec();
    return result.deletedCount ?? 0;
  },

  /** Screenshot file ids of checks older than `before` (used to purge GridFS). */
  async findScreenshotIdsOlderThan(before: Date): Promise<Types.ObjectId[]> {
    const docs = await CheckModel.find(
      { checkedAt: { $lt: before }, screenshotFileId: { $exists: true } },
      { screenshotFileId: 1 },
    )
      .lean()
      .exec();
    return docs
      .map((doc) => doc.screenshotFileId)
      .filter((id): id is Types.ObjectId => Boolean(id));
  },

  async deleteOlderThan(before: Date): Promise<number> {
    const result = await CheckModel.deleteMany({ checkedAt: { $lt: before } }).exec();
    return result.deletedCount ?? 0;
  },
};
