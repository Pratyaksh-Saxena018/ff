import mongoose from 'mongoose';
import { env } from '../config/env';
import { ChatMessage, Dispute } from '../models';
import { runSentinelLayer } from '../ai/sentinel';
import { createDisputeFromMessage } from './disputeService';
import { logger } from '../utils/logger';

export interface SendMessageInput {
  roomId: string;
  senderId: mongoose.Types.ObjectId;
  message: string;
}

export interface SendMessageResult {
  messageId: string;
  toxicityScore: number | null;
  flagged: boolean;
  disputeCreated: boolean;
  disputeId?: string;
  humanReview: boolean;
}

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const doc = await ChatMessage.create({
    roomId: input.roomId,
    senderId: input.senderId,
    message: input.message,
  });

  let toxicityScore: number | null = null;
  let flagged = false;
  let disputeCreated = false;
  let disputeId: string | undefined;
  let humanReview = false;

  try {
    const sentinel = await runSentinelLayer(input.message);
    toxicityScore = sentinel.toxicityScore;
    flagged = sentinel.flagged;
    humanReview = sentinel.humanReview;

    await ChatMessage.updateOne(
      { _id: doc._id },
      { $set: { toxicityScore: sentinel.toxicityScore, flagged: sentinel.flagged } }
    );

    if (sentinel.triggerDispute) {
      const dispute = await createDisputeFromMessage(
        input.roomId,
        doc._id as mongoose.Types.ObjectId,
        input.senderId
      );
      disputeCreated = !!dispute;
      if (dispute) disputeId = (dispute._id as mongoose.Types.ObjectId).toString();
      logger.info('Dispute created from sentinel', { messageId: doc._id, disputeId: dispute?._id });
    }
  } catch (e) {
    logger.error('Sentinel or dispute creation failed', { messageId: doc._id, error: e });
  }

  return {
    messageId: (doc._id as mongoose.Types.ObjectId).toString(),
    toxicityScore,
    flagged,
    disputeCreated,
    disputeId,
    humanReview,
  };
}

export async function getMessagesForRoom(
  roomId: string,
  limit = 100,
  before?: Date
): Promise<unknown[]> {
  const query: Record<string, unknown> = { roomId };
  if (before) query.createdAt = { $lt: before };
  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'username karmaScore juryRank')
    .lean();
  return messages.reverse().map((m) => ({
    _id: m._id,
    roomId: m.roomId,
    senderId: m.senderId,
    message: m.message,
    toxicityScore: m.toxicityScore,
    flagged: m.flagged,
    createdAt: m.createdAt,
  }));
}

export async function getMessageBatchForDispute(
  roomId: string,
  limit = 50
): Promise<Array<{ senderId: string; message: string; createdAt: Date }>> {
  const messages = await ChatMessage.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('senderId message createdAt')
    .lean();
  return messages.reverse().map((m) => ({
    senderId: (m.senderId as mongoose.Types.ObjectId).toString(),
    message: m.message,
    createdAt: m.createdAt,
  }));
}
