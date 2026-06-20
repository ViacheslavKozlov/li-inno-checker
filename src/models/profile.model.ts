import { Schema, model, type HydratedDocument } from 'mongoose';
import { CheckStatus, type Profile } from '../types';

const profileSchema = new Schema<Profile>(
  {
    telegramId: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    lastStatus: { type: String, enum: Object.values(CheckStatus) },
    lastCheckedAt: { type: Date },
  },
  { timestamps: true },
);

// A user cannot register two profiles under the same name.
profileSchema.index({ telegramId: 1, name: 1 }, { unique: true });

export type ProfileDocument = HydratedDocument<Profile>;
export const ProfileModel = model<Profile>('Profile', profileSchema);
