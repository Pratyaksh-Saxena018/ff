import { logger } from '../utils/logger';
import { groqChat, getGroqClient } from './providers/groq';
import { openaiChat, getOpenAIClient } from './providers/openai';
import { geminiChat, getGeminiClient } from './providers/gemini';

const TIMEOUT = 10000;

const BULLY_PROMPT = `You are an AI mediator in a Reflection Room. The user is explaining their side after a dispute. Ask ONE brief, empathetic clarifying question to help them reflect on their intent and the impact of their words. Keep the question under 2 sentences. Do not judge.`;

const VICTIM_PROMPT = `You are an AI mediator in a Safe Space. The user is sharing how they were affected. Ask ONE brief, supportive clarifying question. Keep the question under 2 sentences. Be gentle and validating.`;

export async function generateClarificationResponse(
  role: 'bully' | 'victim',
  lastUserMessage: string,
  priorContext?: string
): Promise<string | null> {
  const systemPrompt = role === 'bully' ? BULLY_PROMPT : VICTIM_PROMPT;
  const userMessage = priorContext
    ? `Prior context: ${priorContext}\n\nUser just said: ${lastUserMessage}\n\nAsk your clarifying question:`
    : `User just said: ${lastUserMessage}\n\nAsk your clarifying question:`;

  const fns: Array<() => Promise<{ content: string }>> = [];
  if (getGroqClient()) fns.push(() => groqChat(systemPrompt, userMessage, { timeout: TIMEOUT }));
  if (getOpenAIClient()) fns.push(() => openaiChat(systemPrompt, userMessage, { timeout: TIMEOUT }));
  if (getGeminiClient()) fns.push(() => geminiChat(systemPrompt, userMessage, { timeout: TIMEOUT }));

  for (const fn of fns) {
    try {
      const { content } = await fn();
      const trimmed = content.trim();
      if (trimmed.length > 0 && trimmed.length < 500) return trimmed;
    } catch (e) {
      logger.warn('Clarification chatbot failed', { error: (e as Error).message });
    }
  }
  return null;
}
