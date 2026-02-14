import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic | null {
  if (!env.CLAUDE_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: env.CLAUDE_KEY });
  return client;
}

export async function claudeSafetyCheck(text: string): Promise<{ toxicityScore: number; flagged: boolean }> {
  const anthropic = getClaudeClient();
  if (!anthropic) throw new Error('Claude API key not configured');

  const prompt = `You are a content safety classifier. Analyze this message for toxicity, harassment, hate, or harm.
Reply with ONLY a JSON object: {"toxicityScore": 0-100, "flagged": true or false}
Message: "${text.replace(/"/g, '\\"')}"`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const message = await anthropic.messages.create(
      {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const textBlock = message.content.find((b) => b.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '{}';
    return parseJsonToxicity(content);
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error('Claude safety error', { error: err });
    throw err;
  }
}

export async function claudeChat(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number }
): Promise<{ content: string; tokensUsed: number }> {
  const anthropic = getClaudeClient();
  if (!anthropic) throw new Error('Claude API key not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? env.AI_TIMEOUT_MS);

  try {
    const message = await anthropic.messages.create(
      {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const textBlock = message.content.find((b) => b.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '';
    const inputTokens = message.usage?.input_tokens ?? 0;
    const outputTokens = message.usage?.output_tokens ?? 0;
    return { content, tokensUsed: inputTokens + outputTokens };
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error('Claude chat error', { error: err });
    throw err;
  }
}

function parseJsonToxicity(content: string): { toxicityScore: number; flagged: boolean } {
  try {
    const cleaned = content.replace(/```json?\s*/g, '').trim();
    const obj = JSON.parse(cleaned);
    const score = Math.min(100, Math.max(0, Number(obj.toxicityScore) ?? 0));
    const flagged = Boolean(obj.flagged);
    return { toxicityScore: score, flagged };
  } catch {
    return { toxicityScore: 0, flagged: false };
  }
}
