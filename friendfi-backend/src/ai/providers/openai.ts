import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!env.OPENAI_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_KEY });
  }
  return client;
}

export async function openaiModeration(text: string): Promise<{ toxicityScore: number; flagged: boolean }> {
  const openai = getOpenAIClient();
  if (!openai) throw new Error('OpenAI API key not configured');

  const response = await openai.moderations.create({
    input: text,
  });

  const result = response.results[0];
  if (!result) return { toxicityScore: 0, flagged: false };

  const categories = result.categories as unknown as Record<string, boolean>;
  const scores = result.category_scores as unknown as Record<string, number>;
  const toxicKeys = ['harassment', 'hate', 'self-harm', 'sexual', 'violence'];
  let maxScore = 0;
  for (const key of toxicKeys) {
    const score = scores[key];
    if (typeof score === 'number') maxScore = Math.max(maxScore, score);
  }
  const flagged = toxicKeys.some((k) => categories[k]);
  return { toxicityScore: Math.round(maxScore * 100), flagged };
}

export async function openaiChat(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number }
): Promise<{ content: string; tokensUsed: number }> {
  const openai = getOpenAIClient();
  if (!openai) throw new Error('OpenAI API key not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? env.AI_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const content = completion.choices[0]?.message?.content ?? '';
    const tokensUsed =
      (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0);
    return { content, tokensUsed };
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error('OpenAI chat error', { error: err });
    throw err;
  }
}
