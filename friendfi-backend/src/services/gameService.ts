import mongoose from 'mongoose';
import { env } from '../config/env';
import { User, GameSession } from '../models';
import { logger } from '../utils/logger';

const KARMA_RESTRICT_THRESHOLD = 300;
const BASE_XP_PER_GAME = 50;
const KARMA_MULTIPLIER_MAX = 1.5;

function karmaMultiplier(karmaScore: number): number {
  if (karmaScore >= env.INITIAL_KARMA) return 1.2;
  if (karmaScore >= KARMA_RESTRICT_THRESHOLD) return 1.0;
  return 0.8;
}

export async function canJoinMatchmaking(userId: string): Promise<{ allowed: boolean; restrictedPool: boolean }> {
  const user = await User.findById(userId).select('karmaScore').lean();
  if (!user) return { allowed: false, restrictedPool: false };
  const restrictedPool = user.karmaScore < KARMA_RESTRICT_THRESHOLD;
  return { allowed: true, restrictedPool };
}

export async function endGameSession(
  playerIds: string[],
  result: Record<string, unknown>
): Promise<{ xpDistributed: Record<string, number> }> {
  const startedAt = new Date(Date.now() - 60000);
  const endedAt = new Date();

  const xpDistributed: Record<string, number> = {};
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const id of playerIds) {
      const user = await User.findById(id).session(session);
      if (!user) continue;
      const mult = karmaMultiplier(user.karmaScore);
      const xp = Math.round(BASE_XP_PER_GAME * mult);
      user.gameXP += xp;
      xpDistributed[id] = xp;
      await user.save({ session });
    }

    await GameSession.create(
      [
        {
          players: playerIds.map((id) => new mongoose.Types.ObjectId(id)),
          result,
          xpDistributed,
          startedAt,
          endedAt,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { xpDistributed };
  } catch (e) {
    await session.abortTransaction();
    logger.error('endGameSession failed', { error: e });
    throw e;
  } finally {
    session.endSession();
  }
}

export async function getGameHistory(userId: string, limit = 20): Promise<unknown[]> {
  const sessions = await GameSession.find({ players: userId })
    .sort({ endedAt: -1 })
    .limit(limit)
    .lean();
  return sessions.map((s) => ({
    _id: s._id,
    players: s.players,
    result: s.result,
    xpDistributed: s.xpDistributed,
    endedAt: s.endedAt,
  }));
}
