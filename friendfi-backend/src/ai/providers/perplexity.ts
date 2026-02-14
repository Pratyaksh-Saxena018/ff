import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// Perplexity is OpenAI-compatible with a different base URL
let client: OpenAI | null = null;

export function getPerplexityClient(): OpenAI | null {
  if (!env.PERPLEXITY_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: env.PERPLEXITY_KEY,
      baseURL: 'https://api.perplexity.ai',
    });
  }
  return client;
}

export async function perplexityChat(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number }
): Promise<{ content: string; tokensUsed: number }> {
  const ppl = getPerplexityClient();
  if (!ppl) throw new Error('Perplexity API key not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? env.AI_TIMEOUT_MS);

  try {
    const completion = await ppl.chat.completions.create(
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 1024,
        temperature: 0.2,
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
    logger.error('Perplexity chat error', { error: err });
    throw err;
  }
}
