import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

mongoose.set('strictQuery', true);

let connecting: Promise<typeof mongoose> | null = null;

/** Connect to MongoDB (idempotent — repeated calls share one connection). */
export async function connectToDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connecting) return connecting;

  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.once('open', () => logger.info('MongoDB connected'));

  connecting = mongoose.connect(env.MONGODB_URI).then((m) => {
    connecting = null;
    return m;
  });
  return connecting;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
