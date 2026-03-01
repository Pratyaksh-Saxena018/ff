import mongoose from 'mongoose';
import { env } from '../config/env';
import { User, Dispute, Vote } from '../models';
import type { FinalVerdict } from '../models';
import { logger, auditLogger } from '../utils/logger';

const RANKS = ['Observer', 'Juror', 'SeniorJuror', 'Guardian'] as const;
const RANK_CASES = [0, 10, 50, 200];

function rankForCases(casesParticipated: number): (typeof RANKS)[number] {
  let i = RANKS.length - 1;
  while (i >= 0 && casesParticipated < RANK_CASES[i]) i--;
  return RANKS[Math.max(0, i)];
}

const MAX_DELTA = 10;

function clampDelta(delta: number): number {
  return Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));
}

export async function applyVerdictKarma(
  disputeId: mongoose.Types.ObjectId,
  verdict: FinalVerdict,
  apologyOffered: boolean
): Promise<void> {
  const dispute = await Dispute.findById(disputeId).lean();
  if (!dispute || dispute.status !== 'CLOSED') return;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const votes = await Vote.find({ disputeId }).lean();
    const forgiveCount = votes.filter((v) => v.vote === 'FORGIVE').length;
    const sanctionCount = votes.filter((v) => v.vote === 'SANCTION').length;
    const majorityVerdict = forgiveCount >= sanctionCount ? 'FORGIVE' : 'SANCTION';

    const bullyId = dispute.bullyId;
    const bully = await User.findById(bullyId).select('+reputationHistory').session(session);
    if (!bully) throw new Error('Bully user not found');

    let bullyDelta = 0;
    if (majorityVerdict === 'FORGIVE') {
      if (apologyOffered) {
        bullyDelta = clampDelta(env.KARMA_FORGIVE_BULLY);
        bully.karmaScore += bullyDelta;
        bully.totalApologiesGiven += 1;
        appendReputation(bully, bullyDelta, 'Apology accepted');
      }
    } else {
      const raw = env.KARMA_SANCTION_BULLY * (bully.totalSanctionsReceived > 0 ? env.REPEAT_OFFENDER_MULTIPLIER : 1);
      bullyDelta = clampDelta(Math.round(raw));
      bully.karmaScore += bullyDelta;
      bully.totalSanctionsReceived += 1;
      appendReputation(bully, bullyDelta, 'Sanction applied');
    }
    await applySuspensionOrBan(bully, session);
    await bully.save({ session });

    const victimId = dispute.victimId;
    const victim = await User.findById(victimId).select('+reputationHistory').session(session);
    if (victim) {
      const victimDelta = clampDelta(env.KARMA_VICTIM_RESTORED ?? 10);
      victim.karmaScore += victimDelta;
      appendReputation(victim, victimDelta, 'Restored after dispute');
      await applySuspensionOrBan(victim, session);
      await victim.save({ session });
    }

    for (const v of votes) {
      const juror = await User.findById(v.voterId).select('+reputationHistory').session(session);
      if (!juror) continue;
      juror.totalCasesParticipated += 1;
      const aligned = v.vote === majorityVerdict;
      const rawDelta = aligned ? env.KARMA_JUROR_ALIGNED : env.KARMA_JUROR_MISALIGNED;
      const delta = clampDelta(rawDelta);
      juror.karmaScore += delta;
      juror.juryAccuracy = (juror.juryAccuracy * (juror.totalCasesParticipated - 1) + (aligned ? 1 : 0)) / juror.totalCasesParticipated;
      juror.juryRank = rankForCases(juror.totalCasesParticipated);
      appendReputation(juror, delta, aligned ? 'Vote aligned with majority' : 'Vote misaligned');
      await applySuspensionOrBan(juror, session);
      await juror.save({ session });
    }

    await session.commitTransaction();
    auditLogger.info('Karma applied', { disputeId, verdict: majorityVerdict, bullyId });
  } catch (e) {
    await session.abortTransaction();
    logger.error('applyVerdictKarma failed', { disputeId, error: e });
    throw e;
  } finally {
    session.endSession();
  }
}

async function applySuspensionOrBan(
  user: mongoose.Document & { karmaScore: number; suspendedUntil?: Date | null; banned?: boolean },
  _session: mongoose.ClientSession
): Promise<void> {
  if (user.karmaScore < env.KARMA_BAN_THRESHOLD) {
    user.set('banned', true);
    user.set('suspendedUntil', null);
  } else if (user.karmaScore < env.KARMA_SUSPEND_THRESHOLD) {
    const until = new Date();
    until.setDate(until.getDate() + env.SUSPENSION_DAYS);
    user.set('suspendedUntil', until);
  }
}

function appendReputation(
  user: { reputationHistory: Array<{ timestamp: Date; delta: number; reason: string }> },
  delta: number,
  reason: string
): void {
  if (!user.reputationHistory) user.reputationHistory = [];
  user.reputationHistory.push({
    timestamp: new Date(),
    delta,
    reason,
  });
  if (user.reputationHistory.length > 100) {
    user.reputationHistory = user.reputationHistory.slice(-100);
  }
}

export async function getLeaderboard(limit = 50): Promise<Array<{ userId: string; username: string; karmaScore: number; gameXP: number; juryRank: string }>> {
  const users = await User.find()
    .sort({ karmaScore: -1 })
    .limit(limit)
    .select('username karmaScore gameXP juryRank')
    .lean();
  return users.map((u) => ({
    userId: (u._id as mongoose.Types.ObjectId).toString(),
    username: u.username,
    karmaScore: u.karmaScore,
    gameXP: u.gameXP,
    juryRank: u.juryRank,
  }));
}

export async function getKarmaRank(userId: string): Promise<{ rank: number; total: number }> {
  const user = await User.findById(userId).select('karmaScore').lean();
  if (!user) return { rank: 0, total: 0 };
  const total = await User.countDocuments();
  const rank = await User.countDocuments({ karmaScore: { $gt: user.karmaScore } }) + 1;
  return { rank, total };
}
