import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getRedisPublisher, getRedisSubscriber } from '../config/redis';
import { User } from '../models';
import { logger, auditLogger } from '../utils/logger';
import { runMediationPipeline, closeVotingAndApplyVerdict } from '../services/disputeService';
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
      origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()),
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
      const user = await User.findById(decoded.sub).select('_id').lean();
      if (!user) return next(new Error('User not found'));
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
        const { getMessagesForRoom } = await import('../services/messageService');
        const messages = await getMessagesForRoom(payload.roomId, 1);
        const last = messages[messages.length - 1];
        io?.to(payload.roomId).emit('messageSent', {
          messageId: result.messageId,
          roomId: payload.roomId,
          senderId: userId,
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
            io?.to(payload.roomId).emit('disputeCreated', { dispute });
            const bullyRoom = `reflection-${disputeIdObj}`;
            const victimRoom = `safety-${disputeIdObj}`;
            io?.to(payload.roomId).emit('courtModeActivated', { disputeId: disputeIdObj, caseNumber: dispute.caseNumber });
            io?.sockets.sockets.forEach((s) => {
              const authSock = s as AuthenticatedSocket;
              const uid = dispute.bullyId?.toString?.() ?? (dispute.bullyId as mongoose.Types.ObjectId).toString();
              const vid = dispute.victimId?.toString?.() ?? (dispute.victimId as mongoose.Types.ObjectId).toString();
              if (authSock.userId === uid) {
                s.join(bullyRoom);
                s.emit('userIsolated', { room: bullyRoom, role: 'bully', disputeId: disputeIdObj });
              } else if (authSock.userId === vid) {
                s.join(victimRoom);
                s.emit('userIsolated', { room: victimRoom, role: 'victim', disputeId: disputeIdObj });
              }
            });
            io?.to(payload.roomId).emit('aiProgressUpdate', { disputeId: disputeIdObj, stage: 'investigating' });
            runMediationPipeline(disputeIdObj)
              .then(() => {
                emitCaseReady(disputeIdObj.toString());
                setTimeout(() => {
                  closeVotingAndApplyVerdict(disputeIdObj).then((verdict) => {
                    if (verdict) {
                      emitVerdict(disputeIdObj.toString(), verdict);
                    }
                  }).catch((e) => logger.error('Close voting failed', { error: e }));
                }, env.VOTE_TIMER_SECONDS * 1000);
              })
              .catch((e) => logger.error('Mediation pipeline failed', { error: e }));
          }
        }
      } catch (e) {
        logger.error('sendMessage socket error', { error: e });
        cb?.(e as Error);
      }
    });

    socket.on('caseReady', (disputeId: string) => {
      io?.to(disputeId).emit('caseReady', { disputeId });
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
