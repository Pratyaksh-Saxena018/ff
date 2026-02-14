import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let client: Groq | null = null;

export function getGroqClient(): Groq | null {
  if (!env.GROQ_KEY) return null;
  if (!client) {
    client = new Groq({ apiKey: env.GROQ_KEY });
  }
  return client;
}

const TOXICITY_PROMPT = `You are a content moderation AI. Analyze the following chat message for toxicity, profanity, harassment, hate speech, or harmful content.
Return ONLY a JSON object: {"toxicityScore": 0-100, "flagged": true/false}
Message: `;

export async function groqToxicityCheck(text: string): Promise<{ toxicityScore: number; flagged: boolean }> {
  const groq = getGroqClient();
  if (!groq) throw new Error('Groq API key not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: TOXICITY_PROMPT + JSON.stringify(text) }],
        max_tokens: 128,
        temperature: 0,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    return parseGroqResponse(raw);
  } catch (err) {
    clearTimeout(timeoutId);
    logger.warn('Groq toxicity check failed', { error: (err as Error).message });
    throw err;
  }
}

export async function groqChat(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number }
): Promise<{ content: string; tokensUsed: number }> {
  const groq = getGroqClient();
  if (!groq) throw new Error('Groq API key not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? env.AI_TIMEOUT_MS);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 512,
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
    logger.warn('Groq chat failed', { error: (err as Error).message });
    throw err;
  }
}

function parseGroqResponse(raw: string): { toxicityScore: number; flagged: boolean } {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const obj = JSON.parse(cleaned) as { toxicityScore?: number; flagged?: boolean };
    return {
      toxicityScore: Math.min(100, Math.max(0, Number(obj.toxicityScore) || 0)),
      flagged: Boolean(obj.flagged),
    };
  } catch {
    return { toxicityScore: 0, flagged: false };
  }
}
