import { env } from '../config/env';
import { logger } from '../utils/logger';
import { openaiModeration, getOpenAIClient } from './providers/openai';
import { geminiClassifyToxicity, getGeminiClient } from './providers/gemini';
import { claudeSafetyCheck, getClaudeClient } from './providers/claude';
import { runProfanityFilter } from './profanityFilter';

export interface SentinelResult {
  toxicityScore: number;
  flagged: boolean;
  triggerDispute: boolean;
  humanReview: boolean;
  providerResults: Array<{ provider: string; score: number; flagged: boolean; error?: string }>;
}

const WEIGHTS: Record<string, number> = { openai: 0.4, gemini: 0.35, claude: 0.25 };

export async function runSentinelLayer(messageText: string): Promise<SentinelResult> {
  const providerResults: SentinelResult['providerResults'] = [];
  const errors: string[] = [];

  const openaiPromise = getOpenAIClient()
    ? openaiModeration(messageText).then((r) => ({ provider: 'openai', ...r }))
    : Promise.reject(new Error('OpenAI not configured'));
  const geminiPromise = getGeminiClient()
    ? geminiClassifyToxicity(messageText).then((r) => ({ provider: 'gemini', ...r }))
    : Promise.reject(new Error('Gemini not configured'));
  const claudePromise = getClaudeClient()
    ? claudeSafetyCheck(messageText).then((r) => ({ provider: 'claude', ...r }))
    : Promise.reject(new Error('Claude not configured'));

  const results = await Promise.allSettled([openaiPromise, geminiPromise, claudePromise]);

  results.forEach((settled, i) => {
    const name = ['openai', 'gemini', 'claude'][i];
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
  const humanReview = successCount < 2;

  let toxicityScore = 0;
  let flagged = providerResults.some((r) => r.flagged && !r.error);

  if (successCount >= 2) {
    toxicityScore = Math.round(
      providerResults
        .filter((r) => !r.error)
        .reduce((acc, r) => {
          const w = WEIGHTS[r.provider as keyof typeof WEIGHTS] ?? 1 / 3;
          return acc + r.score * w;
        }, 0) *
        (3 / Math.max(1, successCount))
    );
    toxicityScore = Math.min(100, toxicityScore);
  } else {
    if (humanReview) {
      logger.info('Sentinel: 2+ providers failed, using fallback profanity filter', { errors });
    }
    const fallback = runProfanityFilter(messageText);
    if (fallback.flagged) {
      toxicityScore = fallback.toxicityScore;
      flagged = true;
    }
  }

  const triggerDispute = !humanReview && toxicityScore >= env.TOXICITY_THRESHOLD;

  return {
    toxicityScore,
    flagged: flagged || triggerDispute,
    triggerDispute: triggerDispute && !humanReview,
    humanReview,
    providerResults,
  };
}
