/** Metadata stored alongside a screenshot in GridFS. */
export interface ScreenshotMeta {
  telegramId: number;
  profileName: string;
  url: string;
}
