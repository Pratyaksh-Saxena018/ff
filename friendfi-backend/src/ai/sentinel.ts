import { env } from '../config/env';
import { logger } from '../utils/logger';
import { openaiModeration, getOpenAIClient } from './providers/openai';
import { geminiClassifyToxicity, getGeminiClient } from './providers/gemini';
import { claudeSafetyCheck, getClaudeClient } from './providers/claude';
import { groqToxicityCheck, getGroqClient } from './providers/groq';
import { runProfanityFilter } from './profanityFilter';

export interface SentinelResult {
  toxicityScore: number;
  flagged: boolean;
  triggerDispute: boolean;
  humanReview: boolean;
  providerResults: Array<{ provider: string; score: number; flagged: boolean; error?: string }>;
}

const WEIGHTS: Record<string, number> = { openai: 0.3, gemini: 0.25, claude: 0.2, groq: 0.35 };

export async function runSentinelLayer(messageText: string): Promise<SentinelResult> {
  const providerResults: SentinelResult['providerResults'] = [];
  const errors: string[] = [];

  const providers: Array<{ name: string; fn: () => Promise<{ toxicityScore: number; flagged: boolean }> }> = [];
  if (getOpenAIClient()) providers.push({ name: 'openai', fn: () => openaiModeration(messageText) });
  if (getGeminiClient()) providers.push({ name: 'gemini', fn: () => geminiClassifyToxicity(messageText) });
  if (getClaudeClient()) providers.push({ name: 'claude', fn: () => claudeSafetyCheck(messageText) });
  if (getGroqClient()) providers.push({ name: 'groq', fn: () => groqToxicityCheck(messageText) });

  const results = providers.length > 0
    ? await Promise.allSettled(providers.map((p) => p.fn().then((r) => ({ provider: p.name, ...r }))))
    : [];

  results.forEach((settled, i) => {
    const name = providers[i]?.name ?? 'unknown';
    if (settled.status === 'fulfilled') {
      providerResults.push({
        provider: name,
        score: settled.value.toxicityScore,
        flagged: settled.value.flagged,
      });
    } else {
      errors.push(settled.reason?.message ?? 'Unknown');
      providerResults.push({
        provider: name,
        score: 0,
        flagged: false,
        error: settled.reason?.message,
      });
      logger.warn('Sentinel provider failed', { provider: name, error: settled.reason });
    }
  });

  const successCount = providerResults.filter((r) => !r.error).length;
  const humanReview = successCount < 1;

  let toxicityScore = 0;
  let flagged = providerResults.some((r) => r.flagged && !r.error);

  if (successCount >= 1) {
    const successful = providerResults.filter((r) => !r.error);
    const totalWeight = successful.reduce((sum, r) => sum + (WEIGHTS[r.provider] ?? 0.25), 0);
    const normWeight = totalWeight > 0 ? totalWeight : 1;
    toxicityScore = Math.round(
      successful.reduce((acc, r) => {
        const w = (WEIGHTS[r.provider] ?? 0.25) / normWeight;
        return acc + r.score * w;
      }, 0)
    );
    toxicityScore = Math.min(100, toxicityScore);
  } else {
    if (providers.length === 0) {
      logger.info('Sentinel: no AI providers configured, using fallback profanity filter');
    } else {
      logger.info('Sentinel: all providers failed, using fallback profanity filter', { errors });
    }
    const fallback = runProfanityFilter(messageText);
    if (fallback.flagged) {
      toxicityScore = fallback.toxicityScore;
      flagged = true;
    }
  }

  const triggerDispute = toxicityScore >= env.TOXICITY_THRESHOLD && (successCount >= 1 || flagged);

  return {
    toxicityScore,
    flagged: flagged || triggerDispute,
    triggerDispute: triggerDispute && !humanReview,
    humanReview,
    providerResults,
  };
}
