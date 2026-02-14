import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let redisPublisher: Redis | null = null;
let redisSubscriber: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    redisClient.on('error', (err) => logger.error('Redis client error', { error: err }));
    redisClient.on('connect', () => logger.info('Redis client connected'));
  }
  return redisClient;
}

export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    redisPublisher.on('error', (err) => logger.error('Redis publisher error', { error: err }));
  }
  return redisPublisher;
}

export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      lazyConnect: true,
    });
    redisSubscriber.on('error', (err) => logger.error('Redis subscriber error', { error: err }));
  }
  return redisSubscriber;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisPublisher) {
    await redisPublisher.quit();
    redisPublisher = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
  logger.info('Redis disconnected');
}
