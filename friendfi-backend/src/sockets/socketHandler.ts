import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getRedisPublisher, getRedisSubscriber } from '../config/redis';
import { User } from '../models';
import { logger, auditLogger } from '../utils/logger';
import { startClarificationTimer, resetClarificationTimer, extractDisputeIdFromRoom } from '../services/disputeTimerService';
import mongoose from 'mongoose';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  const pubClient = getRedisPublisher();
  const subClient = getRedisSubscriber();
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((s: string) => s.trim()),
      methods: ['GET', 'POST'],
    },
    adapter: createAdapter(pubClient, subClient),
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token as string, env.JWT_SECRET) as { sub: string };
      const user = await User.findById(decoded.sub).select('_id banned suspendedUntil').lean();
      if (!user) return next(new Error('User not found'));
      const u = user as { _id: unknown; banned?: boolean; suspendedUntil?: Date | null };
      if (u.banned) return next(new Error('Account is banned'));
      if (u.suspendedUntil && new Date(u.suspendedUntil) > new Date()) return next(new Error('Account is suspended'));
      socket.userId = decoded.sub;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.info('Socket connected', { userId, socketId: socket.id });

    socket.on('joinRoom', (roomId: string, cb?: (ok: boolean) => void) => {
      if (!roomId || typeof roomId !== 'string') {
        cb?.(false);
        return;
      }
      socket.join(roomId);
      cb?.(true);
    });

    socket.on('leaveRoom', (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on('sendMessage', async (payload: { roomId: string; message: string }, cb?: (err: Error | null, data?: unknown) => void) => {
      if (!payload?.roomId || !payload?.message || !userId) {
        cb?.(new Error('Invalid payload'));
        return;
      }
      try {
        const { sendMessage } = await import('../services/messageService');
        const result = await sendMessage({
          roomId: payload.roomId,
          senderId: new mongoose.Types.ObjectId(userId),
          message: payload.message,
        });
        const sender = await User.findById(userId).select('username').lean();
        const senderUsername = sender?.username ?? 'Unknown';
        const { getMessagesForRoom } = await import('../services/messageService');
        const messages = await getMessagesForRoom(payload.roomId, 1);
        const last = messages[messages.length - 1];
        io?.to(payload.roomId).emit('messageSent', {
          messageId: result.messageId,
          roomId: payload.roomId,
          senderId: userId,
          senderUsername,
          message: payload.message,
          toxicityScore: result.toxicityScore,
          flagged: result.flagged,
          disputeCreated: result.disputeCreated,
          humanReview: result.humanReview,
          createdAt: (last as { createdAt?: string })?.createdAt,
        });
        cb?.(null, result);
        if (result.disputeCreated && result.disputeId) {
          const { getDispute } = await import('../services/disputeService');
          const dispute = await getDispute(new mongoose.Types.ObjectId(result.disputeId));
          if (dispute) {
            const disputeIdObj = dispute._id as mongoose.Types.ObjectId;
            const bullyIdStr = dispute.bullyId?.toString?.() ?? (dispute.bullyId as mongoose.Types.ObjectId).toString();
            const victimIdStr = dispute.victimId?.toString?.() ?? (dispute.victimId as mongoose.Types.ObjectId).toString();
            const [bullyUser, victimUser] = await Promise.all([
              User.findById(bullyIdStr).select('username').lean(),
              User.findById(victimIdStr).select('username').lean(),
            ]);
            const bullyUsername = bullyUser?.username ?? 'Unknown';
            const victimUsername = victimUser?.username ?? 'Unknown';
            const disputePayload = {
              ...dispute,
              disputeId: disputeIdObj.toString(),
              bullyUsername,
              victimUsername,
              bullyId: bullyIdStr,
              victimId: victimIdStr,
            };
            io?.to(payload.roomId).emit('disputeCreated', { dispute: disputePayload });
            const bullyRoom = `reflection-${disputeIdObj}`;
            const victimRoom = `safety-${disputeIdObj}`;
            io?.to(payload.roomId).emit('courtModeActivated', {
              disputeId: disputeIdObj.toString(),
              caseNumber: dispute.caseNumber,
              bullyUsername,
              victimUsername,
              bullyId: bullyIdStr,
              victimId: victimIdStr,
            });
            io?.sockets.sockets.forEach((s) => {
              const authSock = s as AuthenticatedSocket;
              if (authSock.userId === bullyIdStr) {
                s.join(bullyRoom);
                s.emit('userIsolated', {
                  room: bullyRoom,
                  role: 'bully',
                  disputeId: disputeIdObj.toString(),
                  bullyUsername,
                  victimUsername,
                  caseNumber: dispute.caseNumber,
                });
              } else if (authSock.userId === victimIdStr) {
                s.join(victimRoom);
                s.emit('userIsolated', {
                  room: victimRoom,
                  role: 'victim',
                  disputeId: disputeIdObj.toString(),
                  bullyUsername,
                  victimUsername,
                  caseNumber: dispute.caseNumber,
                });
              }
            });
            io?.to(payload.roomId).emit('aiProgressUpdate', { disputeId: disputeIdObj, stage: 'investigating' });
            startClarificationTimer(disputeIdObj);
          }
        } else {
          const disputeIdFromRoom = extractDisputeIdFromRoom(payload.roomId);
          if (disputeIdFromRoom) {
            resetClarificationTimer(disputeIdFromRoom);
            const role = payload.roomId.startsWith('reflection-') ? 'bully' : 'victim';
            const { generateClarificationResponse } = await import('../ai/clarificationChatbot');
            const { getMessagesForRoom } = await import('../services/messageService');
            const prior = await getMessagesForRoom(payload.roomId, 5);
            const priorContext = prior
              .slice(0, -1)
              .map((m: { message?: string }) => m.message)
              .filter(Boolean)
              .join(' | ');
            generateClarificationResponse(role, payload.message, priorContext || undefined)
              .then((aiMessage) => {
                if (aiMessage) {
                  io?.to(payload.roomId).emit('aiClarificationResponse', {
                    roomId: payload.roomId,
                    message: aiMessage,
                    disputeId: disputeIdFromRoom,
                  });
                }
              })
              .catch((e) => logger.warn('Clarification AI failed', { error: (e as Error).message }));
          }
        }
      } catch (e) {
        logger.error('sendMessage socket error', { error: e });
        cb?.(e as Error);
      }
    });

    socket.on('voteCast', async (payload: { disputeId: string; vote: 'FORGIVE' | 'SANCTION' }, cb?: (err: Error | null) => void) => {
      if (!payload?.disputeId || !payload?.vote) {
        cb?.(new Error('Invalid payload'));
        return;
      }
      try {
        const { castVote } = await import('../services/disputeService');
        const result = await castVote(
          new mongoose.Types.ObjectId(payload.disputeId),
          new mongoose.Types.ObjectId(userId),
          payload.vote
        );
        if (!result.accepted) {
          cb?.(new Error(result.message ?? 'Vote rejected'));
          return;
        }
        io?.emit('voteCast', { disputeId: payload.disputeId, voterId: userId, vote: payload.vote });
        cb?.(null);
      } catch (e) {
        auditLogger.warn('Vote manipulation attempt', { userId, disputeId: payload.disputeId, error: (e as Error).message });
        cb?.(e as Error);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { userId, socketId: socket.id, reason });
    });
  });

  return io;
}

export function emitCaseReady(disputeId: string): void {
  io?.emit('caseReady', { disputeId });
}

export function emitVerdict(disputeId: string, verdict: string): void {
  io?.emit('verdictAnnounced', { disputeId, verdict });
  io?.emit('karmaUpdated', { disputeId });
}
