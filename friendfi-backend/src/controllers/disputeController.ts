import { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middlewares/authMiddleware';
import {
  getDispute,
  getActiveDisputesForRoom,
  castVote,
  closeVotingAndApplyVerdict,
} from '../services/disputeService';
import { disputeIdParamSchema, castVoteSchema } from '../utils/validationSchemas';

export async function handleGetDispute(req: AuthRequest, res: Response): Promise<void> {
  const { disputeId } = disputeIdParamSchema.parse(req.params);
  const dispute = await getDispute(new mongoose.Types.ObjectId(disputeId));
  if (!dispute) {
    res.status(404).json({ success: false, error: 'Dispute not found' });
    return;
  }
  res.json({ success: true, dispute });
}

export async function handleGetRoomDisputes(req: AuthRequest, res: Response): Promise<void> {
  const { roomId } = req.params as { roomId: string };
  const disputes = await getActiveDisputesForRoom(roomId);
  res.json({ success: true, disputes });
}

export async function handleCastVote(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const { disputeId } = disputeIdParamSchema.parse(req.params);
  const body = castVoteSchema.parse(req.body);
  const result = await castVote(
    new mongoose.Types.ObjectId(disputeId),
    req.userId as unknown as mongoose.Types.ObjectId,
    body.vote
  );
  if (!result.accepted) {
    res.status(400).json({ success: false, error: result.message });
    return;
  }
  res.json({ success: true, message: 'Vote recorded' });
}

export async function handleCloseVoting(req: AuthRequest, res: Response): Promise<void> {
  const { disputeId } = disputeIdParamSchema.parse(req.params);
  const verdict = await closeVotingAndApplyVerdict(new mongoose.Types.ObjectId(disputeId));
  if (verdict === null) {
    res.status(400).json({ success: false, error: 'Voting could not be closed or quorum not met' });
    return;
  }
  res.json({ success: true, verdict });
}
