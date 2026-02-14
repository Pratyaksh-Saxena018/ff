import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let client: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI | null {
  if (!env.GEMINI_KEY) return null;
  if (!client) client = new GoogleGenerativeAI(env.GEMINI_KEY);
  return client;
}

export async function geminiClassifyToxicity(text: string): Promise<{ toxicityScore: number; flagged: boolean }> {
  const gen = getGeminiClient();
  if (!gen) throw new Error('Gemini API key not configured');

  const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `You are a content safety classifier. Analyze this message for toxicity, harassment, hate, or harm.
Reply with ONLY a JSON object: {"toxicityScore": 0-100, "flagged": true or false}
Message: "${text.replace(/"/g, '\\"')}"`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(prompt);
    clearTimeout(timeoutId);
    const response = result.response;
    const content = response.text()?.trim() ?? '{}';
    const parsed = parseJsonToxicity(content);
    return parsed;
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error('Gemini toxicity error', { error: err });
    throw err;
  }
}

export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  options?: { timeout?: number }
): Promise<{ content: string; tokensUsed: number }> {
  const gen = getGeminiClient();
  if (!gen) throw new Error('Gemini API key not configured');

  const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? env.AI_TIMEOUT_MS);

  try {
    const result = await model.generateContent(fullPrompt);
    clearTimeout(timeoutId);
    const content = result.response.text()?.trim() ?? '';
    return { content, tokensUsed: Math.ceil((fullPrompt.length + content.length) / 4) };
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error('Gemini chat error', { error: err });
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
