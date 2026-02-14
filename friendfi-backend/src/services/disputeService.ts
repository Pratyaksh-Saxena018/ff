import mongoose from 'mongoose';
import { env } from '../config/env';
import { Dispute, Vote, ChatMessage, User } from '../models';
import type { IDispute, FinalVerdict } from '../models';
import {
  interviewBully,
  interviewVictim,
  clerkSummarize,
  ethicValidate,
} from '../ai/mediation';
import { applyVerdictKarma } from './karmaService';
import { logger, auditLogger } from '../utils/logger';

let caseCounter = 0;

function nextCaseNumber(): string {
  caseCounter += 1;
  return `FF-${Date.now().toString(36).toUpperCase()}-${caseCounter}`;
}

export async function createDisputeFromMessage(
  roomId: string,
  messageId: mongoose.Types.ObjectId,
  senderId: mongoose.Types.ObjectId
): Promise<IDispute> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existing = await Dispute.findOne({
      roomId,
      status: { $in: ['INVESTIGATING', 'READY_FOR_VOTE'] },
      $or: [{ bullyId: senderId }, { victimId: senderId }],
    }).session(session);
    if (existing) {
      await session.abortTransaction();
      throw new Error('Dispute already open for this user in this room');
    }

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate<{ senderId: { _id: mongoose.Types.ObjectId } }>('senderId', '_id')
      .lean()
      .session(session);

    const victimCandidates = messages
      .filter((m) => !(m.senderId as { _id: mongoose.Types.ObjectId })?._id?.equals(senderId))
      .map((m) => ({ id: (m.senderId as { _id: mongoose.Types.ObjectId })._id, msg: m.message }));

    let victimId: mongoose.Types.ObjectId;
    if (victimCandidates.length > 0) {
      const lastOther = victimCandidates[victimCandidates.length - 1];
      victimId = lastOther.id;
    } else {
      await session.abortTransaction();
      throw new Error('Cannot determine victim from message context');
    }

    const caseNumber = nextCaseNumber();
    const dispute = await Dispute.create(
      [
        {
          caseNumber,
          bullyId: senderId,
          victimId,
          roomId,
          triggerType: 'AI',
          aiConfidence: 0,
          status: 'INVESTIGATING',
        },
      ],
      { session }
    );
    const doc = dispute[0];
    await session.commitTransaction();
    auditLogger.info('Dispute created', { disputeId: doc._id, caseNumber, bullyId: senderId, victimId });
    return doc;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

export async function runMediationPipeline(disputeId: mongoose.Types.ObjectId): Promise<void> {
  const dispute = await Dispute.findById(disputeId).lean();
  if (!dispute || dispute.status !== 'INVESTIGATING') return;

  const bullyMessages = await ChatMessage.find({
    roomId: dispute.roomId,
    senderId: dispute.bullyId,
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();
  const victimMessages = await ChatMessage.find({
    roomId: dispute.roomId,
    senderId: dispute.victimId,
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  const bullyBatch = bullyMessages.map((m) => m.message);
  const victimBatch = victimMessages.map((m) => m.message);

  const [bullyResult, victimResult] = await Promise.all([
    interviewBully(disputeId, bullyBatch, victimBatch),
    interviewVictim(disputeId, victimBatch, bullyBatch),
  ]);

  let summary = await clerkSummarize(disputeId, bullyResult, victimResult);
  const validation = await ethicValidate(disputeId, summary);
  if (!validation.valid && validation.needsRegeneration) {
    summary = await clerkSummarize(disputeId, bullyResult, victimResult);
    const revalidate = await ethicValidate(disputeId, summary);
    if (!revalidate.valid) {
      logger.warn('Ethic validation failed after retry, flagging for admin', { disputeId });
      await Dispute.updateOne(
        { _id: disputeId },
        {
          $set: {
            aiSummary: summary,
            remorseScore: bullyResult.remorseScore,
            harmLevel: victimResult.harmLevel,
            apologyOffered: bullyResult.apologyDetected,
            status: 'READY_FOR_VOTE',
          },
        }
      );
    }
  }

  await Dispute.updateOne(
    { _id: disputeId },
    {
      $set: {
        aiSummary: summary,
        remorseScore: bullyResult.remorseScore,
        harmLevel: victimResult.harmLevel,
        apologyOffered: bullyResult.apologyDetected,
        status: 'READY_FOR_VOTE',
      },
    }
  );
}

export async function castVote(
  disputeId: mongoose.Types.ObjectId,
  voterId: mongoose.Types.ObjectId,
  vote: 'FORGIVE' | 'SANCTION'
): Promise<{ accepted: boolean; message?: string }> {
  const dispute = await Dispute.findById(disputeId).lean();
  if (!dispute) return { accepted: false, message: 'Dispute not found' };
  if (dispute.status !== 'READY_FOR_VOTE') return { accepted: false, message: 'Voting closed' };
  if (dispute.bullyId.equals(voterId) || dispute.victimId.equals(voterId)) {
    auditLogger.warn('Vote from party to dispute attempted', { disputeId, voterId });
    return { accepted: false, message: 'Parties cannot vote' };
  }

  const existing = await Vote.findOne({ disputeId, voterId });
  if (existing) return { accepted: false, message: 'Already voted' };

  await Vote.create({ disputeId, voterId, vote });
  return { accepted: true };
}

export async function closeVotingAndApplyVerdict(disputeId: mongoose.Types.ObjectId): Promise<FinalVerdict> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const dispute = await Dispute.findById(disputeId).session(session);
    if (!dispute || dispute.status !== 'READY_FOR_VOTE') {
      await session.abortTransaction();
      return null;
    }

    const votes = await Vote.find({ disputeId }).session(session).lean();
    const forgiveCount = votes.filter((v) => v.vote === 'FORGIVE').length;
    const sanctionCount = votes.filter((v) => v.vote === 'SANCTION').length;

    if (votes.length < env.MIN_QUORUM_VOTES) {
      await session.abortTransaction();
      logger.warn('Quorum not met', { disputeId, votes: votes.length, min: env.MIN_QUORUM_VOTES });
      return null;
    }

    let finalVerdict: FinalVerdict = forgiveCount >= sanctionCount ? 'FORGIVE' : 'SANCTION';
    if (forgiveCount === sanctionCount) finalVerdict = 'FORGIVE';

    dispute.finalVerdict = finalVerdict;
    dispute.status = 'CLOSED';
    dispute.closedAt = new Date();
    await dispute.save({ session });
    await session.commitTransaction();

    await applyVerdictKarma(disputeId, finalVerdict, dispute.apologyOffered);
    auditLogger.info('Verdict applied', { disputeId, finalVerdict });
    return finalVerdict;
  } catch (e) {
    await session.abortTransaction();
    logger.error('closeVotingAndApplyVerdict failed', { disputeId, error: e });
    throw e;
  } finally {
    session.endSession();
  }
}

export async function getDispute(disputeId: mongoose.Types.ObjectId): Promise<IDispute | null> {
  const doc = await Dispute.findById(disputeId).lean();
  return doc as IDispute | null;
}

export async function getActiveDisputesForRoom(roomId: string): Promise<IDispute[]> {
  const docs = await Dispute.find({
    roomId,
    status: { $in: ['INVESTIGATING', 'READY_FOR_VOTE'] },
  })
    .sort({ createdAt: -1 })
    .lean();
  return docs as unknown as IDispute[];
}

export async function getReadyForVoteDisputes(): Promise<IDispute[]> {
  const docs = await Dispute.find({ status: 'READY_FOR_VOTE' }).lean();
  return docs as unknown as IDispute[];
}
