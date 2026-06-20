import { Types } from 'mongoose';
import { CheckModel, type CheckDocument } from '../models/check.model';
import type { CreateCheckInput } from '../types';

export const checkRepository = {
  create(input: CreateCheckInput): Promise<CheckDocument> {
    return CheckModel.create(input);
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
};
