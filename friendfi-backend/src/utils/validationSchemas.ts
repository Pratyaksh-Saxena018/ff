import { z } from 'zod';

export const signUpSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const sendMessageSchema = z.object({
  roomId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

export const castVoteSchema = z.object({
  vote: z.enum(['FORGIVE', 'SANCTION']),
});

export const disputeIdParamSchema = z.object({
  disputeId: z.string().regex(/^[a-f0-9]{24}$/),
});

export const roomIdParamSchema = z.object({
  roomId: z.string().min(1),
});

export const endGameSchema = z.object({
  playerIds: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1),
  result: z.record(z.unknown()).optional(),
});

export const paginationQuerySchema = z.object({
  limit: z.string().transform(Number).optional().default('50'),
  before: z.string().datetime().optional(),
});
