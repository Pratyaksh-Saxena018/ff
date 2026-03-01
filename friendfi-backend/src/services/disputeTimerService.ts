import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { runMediationPipeline, closeVotingAndApplyVerdict } from './disputeService';
import { getIO } from '../sockets/socketHandler';

const clarificationTimers = new Map<string, { timeoutId: NodeJS.Timeout }>();

const CLARIFICATION_SECONDS = 60;

function emitSummaryReady(disputeId: string, summary: unknown): void {
  const io = getIO();
  if (!io) return;
  io.emit('summaryReady', { disputeId, summary });
}

export function startClarificationTimer(disputeId: mongoose.Types.ObjectId): void {
  const id = disputeId.toString();
  const existing = clarificationTimers.get(id);
  if (existing) clearTimeout(existing.timeoutId);

  const ms = CLARIFICATION_SECONDS * 1000;
  const timeoutId = setTimeout(async () => {
    clarificationTimers.delete(id);
    logger.info('Clarification timer fired, running mediation', { disputeId: id });
    try {
      await runMediationPipeline(disputeId);
      const { getDispute } = await import('./disputeService');
      const dispute = await getDispute(disputeId);
      if (dispute && dispute.status === 'READY_FOR_VOTE') {
        emitSummaryReady(id, dispute.aiSummary);
        const { emitCaseReady, emitVerdict } = await import('../sockets/socketHandler');
        emitCaseReady(id);
        setTimeout(async () => {
          const verdict = await closeVotingAndApplyVerdict(disputeId).catch((e) => {
            logger.error('Close voting failed', { error: e });
            return null;
          });
          if (verdict) emitVerdict(id, verdict);
        }, env.VOTE_TIMER_SECONDS * 1000);
      }
    } catch (e) {
      logger.error('Mediation after clarification failed', { disputeId: id, error: e });
    }
  }, ms);

  clarificationTimers.set(id, { timeoutId });
}

export function resetClarificationTimer(disputeId: string): boolean {
  const existing = clarificationTimers.get(disputeId);
  if (!existing) return false;
  clearTimeout(existing.timeoutId);
  const objId = new mongoose.Types.ObjectId(disputeId);
  startClarificationTimer(objId);
  return true;
}

export function extractDisputeIdFromRoom(roomId: string): string | null {
  if (roomId.startsWith('reflection-')) return roomId.replace('reflection-', '');
  if (roomId.startsWith('safety-')) return roomId.replace('safety-', '');
  return null;
}
