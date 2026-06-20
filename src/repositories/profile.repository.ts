import { Types } from 'mongoose';
import { ProfileModel, type ProfileDocument } from '../models/profile.model';
import type { CheckStatus, CreateProfileInput } from '../types';

export const profileRepository = {
  create(input: CreateProfileInput): Promise<ProfileDocument> {
    return ProfileModel.create(input);
  },

  findByUser(telegramId: number): Promise<ProfileDocument[]> {
    return ProfileModel.find({ telegramId }).sort({ name: 1 }).exec();
  },

  findByUserAndName(telegramId: number, name: string): Promise<ProfileDocument | null> {
    return ProfileModel.findOne({ telegramId, name }).exec();
  },

  findById(id: Types.ObjectId | string): Promise<ProfileDocument | null> {
    return ProfileModel.findById(id).exec();
  },

  deleteByUserAndName(telegramId: number, name: string): Promise<ProfileDocument | null> {
    return ProfileModel.findOneAndDelete({ telegramId, name }).exec();
  },

  /** Every tracked profile across all users (used by the weekly cron pass). */
  findAll(): Promise<ProfileDocument[]> {
    return ProfileModel.find().sort({ telegramId: 1, name: 1 }).exec();
  },

  countByUser(telegramId: number): Promise<number> {
    return ProfileModel.countDocuments({ telegramId }).exec();
  },

  async updateLastCheck(
    id: Types.ObjectId,
    status: CheckStatus,
    checkedAt: Date,
  ): Promise<void> {
    await ProfileModel.updateOne(
      { _id: id },
      { $set: { lastStatus: status, lastCheckedAt: checkedAt } },
    ).exec();
  },
};
