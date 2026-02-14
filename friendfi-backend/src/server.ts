import 'dotenv/config';
import http from 'http';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { getRedisClient } from './config/redis';
import app from './app';
import { initSocketServer } from './sockets/socketHandler';
import { logger } from './utils/logger';
import { closeQueues } from './jobs/queues';
import { disconnectRedis } from './config/redis';

const PORT = env.PORT;

async function main(): Promise<void> {
  await connectDatabase();
  await getRedisClient().connect().catch(() => {});

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`FriendFi backend listening on port ${PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    httpServer.close();
    await closeQueues();
    await disconnectRedis();
    await import('./config/database').then((m) => m.disconnectDatabase());
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  logger.error('Startup failed', { error: e });
  process.exit(1);
});
