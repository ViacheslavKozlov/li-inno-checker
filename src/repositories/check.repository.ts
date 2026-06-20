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
