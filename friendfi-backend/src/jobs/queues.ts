import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { runMediationPipeline } from '../services/disputeService';
import { getIO } from '../sockets/socketHandler';
import mongoose from 'mongoose';

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

export const MEDIATION_QUEUE_NAME = 'mediation';

export const mediationQueue = new Queue(MEDIATION_QUEUE_NAME, {
  connection: connection as unknown as import('bullmq').ConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
  },
});

interface MediationJobData {
  disputeId: string;
  roomId: string;
}

export function addMediationJob(data: MediationJobData): Promise<Job<MediationJobData>> {
  return mediationQueue.add('run', data, { jobId: data.disputeId });
}

const mediationWorker = new Worker<MediationJobData>(
  MEDIATION_QUEUE_NAME,
  async (job) => {
    const { disputeId } = job.data;
    const id = new mongoose.Types.ObjectId(disputeId);
    await runMediationPipeline(id);
    const io = getIO();
    if (io) {
      io.emit('aiProgressUpdate', { disputeId, stage: 'ready_for_vote' });
      const { emitCaseReady } = await import('../sockets/socketHandler');
      emitCaseReady(disputeId);
    }
  },
  {
    connection: connection as unknown as import('bullmq').ConnectionOptions,
    concurrency: 2,
  }
);

mediationWorker.on('completed', (job) => {
  logger.info('Mediation job completed', { jobId: job.id });
});

mediationWorker.on('failed', (job, err) => {
  logger.error('Mediation job failed', { jobId: job?.id, error: err?.message });
});

export async function closeQueues(): Promise<void> {
  await mediationWorker.close();
  await mediationQueue.close();
  connection.disconnect();
}
