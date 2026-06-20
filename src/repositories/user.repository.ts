import { UserModel, type UserDocument } from '../models/user.model';
import type { UpsertUserInput } from '../types';

export const userRepository = {
  /** Insert or update a user by telegramId; always returns the current document. */
  async upsert(input: UpsertUserInput): Promise<UserDocument> {
    const doc = await UserModel.findOneAndUpdate(
      { telegramId: input.telegramId },
      { $set: input },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
    return doc as UserDocument;
  },

  findAll(): Promise<UserDocument[]> {
    return UserModel.find().exec();
  },
};
