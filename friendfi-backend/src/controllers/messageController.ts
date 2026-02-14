import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import mongoose from 'mongoose';
import { sendMessage, getMessagesForRoom } from '../services/messageService';
import { sendMessageSchema } from '../utils/validationSchemas';
import { z } from 'zod';

const roomMessagesQuery = z.object({
  limit: z.string().transform(Number).optional().default('100'),
  before: z.string().optional(),
});

export async function handleSendMessage(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const body = sendMessageSchema.parse(req.body);
  const { messageId, toxicityScore, flagged, disputeCreated, humanReview } = await sendMessage({
    roomId: body.roomId,
    senderId: new mongoose.Types.ObjectId(req.userId!),
    message: body.message,
  });
  res.status(201).json({
    success: true,
    messageId,
    toxicityScore,
    flagged,
    disputeCreated,
    humanReview,
  });
}

export async function handleGetRoomMessages(req: AuthRequest, res: Response): Promise<void> {
  const { roomId } = req.params as { roomId: string };
  const query = roomMessagesQuery.parse(req.query);
  const before = query.before ? new Date(query.before) : undefined;
  const messages = await getMessagesForRoom(roomId, query.limit, before);
  res.json({ success: true, messages });
}
