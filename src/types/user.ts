/** A Telegram user — the multi-user isolation entity (key = telegramId). */
export interface User {
  /** Telegram user id. */
  telegramId: number;
  /** Chat to deliver messages/photos to (usually equals telegramId for private chats). */
  chatId: number;
  username?: string;
  firstName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UpsertUserInput = Pick<User, 'telegramId' | 'chatId' | 'username' | 'firstName'>;
