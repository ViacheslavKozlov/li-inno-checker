import { Schema, model, type HydratedDocument } from 'mongoose';
import { CheckStatus, type Check } from '../types';

const checkSchema = new Schema<Check>({
  profileId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  telegramId: { type: Number, required: true, index: true },
  url: { type: String, required: true },
  status: { type: String, enum: Object.values(CheckStatus), required: true },
  screenshotFileId: { type: Schema.Types.ObjectId },
  finalUrl: { type: String },
  title: { type: String },
  reason: { type: String },
  error: { type: String },
  checkedAt: { type: Date, required: true, default: Date.now, index: true },
});

export type CheckDocument = HydratedDocument<Check>;
export const CheckModel = model<Check>('Check', checkSchema);
