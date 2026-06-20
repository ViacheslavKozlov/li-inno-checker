import { Schema, model, type HydratedDocument } from 'mongoose';
import type { User } from '../types';

const userSchema = new Schema<User>(
  {
    telegramId: { type: Number, required: true, unique: true },
    chatId: { type: Number, required: true },
    username: { type: String },
    firstName: { type: String },
  },
  { timestamps: true },
);

export type UserDocument = HydratedDocument<User>;
export const UserModel = model<User>('User', userSchema);
