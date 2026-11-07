import mongoose from 'mongoose';

const connectionStates = [
  'disconnected',
  'connected',
  'connecting',
  'disconnecting',
];

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export function getDatabaseStatus() {
  if (!isDatabaseConfigured()) {
    return { state: 'not_configured' };
  }

  return {
    state: connectionStates[mongoose.connection.readyState] ?? 'unknown',
  };
}

export async function connectDatabase() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.info('Connected to MongoDB.');
}
