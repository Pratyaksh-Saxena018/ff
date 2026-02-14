import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AITranscript } from '../models';
import type { IAISummary } from '../models/Dispute';
import { openaiChat, getOpenAIClient } from './providers/openai';
import { geminiChat, getGeminiClient } from './providers/gemini';
import { claudeChat, getClaudeClient } from './providers/claude';
import { perplexityChat, getPerplexityClient } from './providers/perplexity';
import { groqChat, getGroqClient } from './providers/groq';

const TIMEOUT = env.AI_TIMEOUT_MS;

export interface BullyInterviewResult {
  remorseScore: number;
  apologyDetected: boolean;
  transcripts: Array<{ provider: string; input: string; output: string; tokensUsed: number }>;
}

export interface VictimInterviewResult {
  harmLevel: number;
  emotionalDistress: number;
  transcripts: Array<{ provider: string; input: string; output: string; tokensUsed: number }>;
}

async function storeTranscript(
  disputeId: mongoose.Types.ObjectId,
  role: 'BULLY' | 'VICTIM' | 'SENTINEL' | 'MEDIATOR' | 'CLERK' | 'VALIDATOR',
  provider: 'OPENAI' | 'GEMINI' | 'CLAUDE' | 'PERPLEXITY' | 'GROQ',
  input: string,
  output: string,
  tokensUsed: number
): Promise<void> {
  await AITranscript.create({
    disputeId,
    role,
    provider,
    input,
    output,
    tokensUsed,
  });
}

export async function interviewBully(
  disputeId: mongoose.Types.ObjectId,
  bullyMessageBatch: string[],
  victimMessageBatch: string[]
): Promise<BullyInterviewResult> {
  const context = `Bully messages: ${bullyMessageBatch.join(' | ')}\nVictim messages: ${victimMessageBatch.join(' | ')}`;
  const systemPrompt = `You are a mediator analyzing the accused person's intent and emotional state. Output JSON: {"remorseScore": 0-100, "apologyDetected": boolean}. Be concise.`;

  const tasks: Array<() => Promise<{ content: string; tokensUsed: number }>> = [];
  const providers: string[] = [];
  if (getOpenAIClient()) { tasks.push(() => openaiChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('OPENAI'); }
  if (getClaudeClient()) { tasks.push(() => claudeChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('CLAUDE'); }
  if (getGeminiClient()) { tasks.push(() => geminiChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('GEMINI'); }
  if (getPerplexityClient()) { tasks.push(() => perplexityChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('PERPLEXITY'); }
  if (getGroqClient()) { tasks.push(() => groqChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('GROQ'); }
  const results = await Promise.allSettled(tasks.map((t) => t()));

  let remorseSum = 0;
  let apologyCount = 0;
  const transcripts: BullyInterviewResult['transcripts'] = [];

  results.forEach((settled, i) => {
    const provider = providers[i];
    if (settled.status === 'fulfilled') {
      const { content, tokensUsed } = settled.value;
      storeTranscript(disputeId, 'BULLY', provider as 'OPENAI' | 'GEMINI' | 'CLAUDE' | 'PERPLEXITY' | 'GROQ', context, content, tokensUsed).catch((e) => logger.error('Store transcript', e));
      transcripts.push({ provider, input: context, output: content, tokensUsed });
      try {
        const cleaned = content.replace(/```json?\s*/g, '').trim();
        const obj = JSON.parse(cleaned);
        remorseSum += Math.min(100, Math.max(0, Number(obj.remorseScore) ?? 50));
        if (obj.apologyDetected) apologyCount++;
      } catch {
        remorseSum += 50;
      }
    }
  });

  const n = results.filter((r) => r.status === 'fulfilled').length;
  const remorseScore = n > 0 ? Math.round(remorseSum / n) : 50;
  const apologyDetected = apologyCount > 0;

  return { remorseScore, apologyDetected, transcripts };
}

export async function interviewVictim(
  disputeId: mongoose.Types.ObjectId,
  victimMessageBatch: string[],
  bullyMessageBatch: string[]
): Promise<VictimInterviewResult> {
  const context = `Victim messages: ${victimMessageBatch.join(' | ')}\nAccused messages: ${bullyMessageBatch.join(' | ')}`;
  const systemPrompt = `You are a mediator assessing harm to the victim. Output JSON: {"harmLevel": 0-100, "emotionalDistress": 0-100}. Be concise.`;

  const tasks: Array<() => Promise<{ content: string; tokensUsed: number }>> = [];
  const providers: string[] = [];
  if (getOpenAIClient()) { tasks.push(() => openaiChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('OPENAI'); }
  if (getClaudeClient()) { tasks.push(() => claudeChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('CLAUDE'); }
  if (getGeminiClient()) { tasks.push(() => geminiChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('GEMINI'); }
  if (getGroqClient()) { tasks.push(() => groqChat(systemPrompt, context, { timeout: TIMEOUT })); providers.push('GROQ'); }
  const results = await Promise.allSettled(tasks.map((t) => t()));

  let harmSum = 0;
  let distressSum = 0;
  const transcripts: VictimInterviewResult['transcripts'] = [];

  results.forEach((settled, i) => {
    const provider = providers[i];
    if (settled.status === 'fulfilled') {
      const { content, tokensUsed } = settled.value;
      storeTranscript(disputeId, 'VICTIM', provider as 'OPENAI' | 'GEMINI' | 'CLAUDE' | 'GROQ', context, content, tokensUsed).catch((e) => logger.error('Store transcript', e));
      transcripts.push({ provider, input: context, output: content, tokensUsed });
      try {
        const cleaned = content.replace(/```json?\s*/g, '').trim();
        const obj = JSON.parse(cleaned);
        harmSum += Math.min(100, Math.max(0, Number(obj.harmLevel) ?? 50));
        distressSum += Math.min(100, Math.max(0, Number(obj.emotionalDistress) ?? 50));
      } catch {
        harmSum += 50;
        distressSum += 50;
      }
    }
  });

  const n = results.filter((r) => r.status === 'fulfilled').length;
  const harmLevel = n > 0 ? Math.round(harmSum / n) : 50;
  const emotionalDistress = n > 0 ? Math.round(distressSum / n) : 50;

  return { harmLevel, emotionalDistress, transcripts };
}

export async function clerkSummarize(
  disputeId: mongoose.Types.ObjectId,
  bullyResult: BullyInterviewResult,
  victimResult: VictimInterviewResult
): Promise<IAISummary> {
  const payload = JSON.stringify({
    bully: { remorseScore: bullyResult.remorseScore, apologyDetected: bullyResult.apologyDetected },
    victim: { harmLevel: victimResult.harmLevel, emotionalDistress: victimResult.emotionalDistress },
  });
  const systemPrompt = `You are a blind clerk. Summarize this dispute data into a neutral JSON with: intentClassification (string), harmLevel (0-100), remorseProbability (0-100), apologyOffered (boolean), contextSummary (string). No names or sides.`;

  const openai = getOpenAIClient();
  const gemini = getGeminiClient();
  const groq = getGroqClient();
  const fn = openai
    ? () => openaiChat(systemPrompt, payload, { timeout: TIMEOUT })
    : gemini
    ? () => geminiChat(systemPrompt, payload, { timeout: TIMEOUT })
    : groq
    ? () => groqChat(systemPrompt, payload, { timeout: TIMEOUT })
    : null;

  if (!fn) throw new Error('No summarizer (OpenAI, Gemini, or Groq) configured');
  const { content, tokensUsed } = await fn();
  await storeTranscript(
    disputeId,
    'CLERK',
    openai ? 'OPENAI' : gemini ? 'GEMINI' : groq ? 'GROQ' : 'OPENAI',
    payload,
    content,
    tokensUsed
  );

  try {
    const cleaned = content.replace(/```json?\s*/g, '').trim();
    const obj = JSON.parse(cleaned);
    return {
      intentClassification: String(obj.intentClassification ?? 'unknown'),
      harmLevel: Math.min(100, Math.max(0, Number(obj.harmLevel) ?? 50)),
      remorseProbability: Math.min(100, Math.max(0, Number(obj.remorseProbability) ?? 50)),
      apologyOffered: Boolean(obj.apologyOffered),
      contextSummary: String(obj.contextSummary ?? ''),
    };
  } catch (e) {
    logger.error('Clerk summary parse failed', { error: e });
    return {
      intentClassification: 'unknown',
      harmLevel: victimResult.harmLevel,
      remorseProbability: bullyResult.remorseScore,
      apologyOffered: bullyResult.apologyDetected,
      contextSummary: 'Parse failed',
    };
  }
}

export async function ethicValidate(
  disputeId: mongoose.Types.ObjectId,
  summary: IAISummary
): Promise<{ valid: boolean; needsRegeneration: boolean }> {
  const claude = getClaudeClient();
  if (!claude) return { valid: true, needsRegeneration: false };

  const prompt = `Is this dispute summary neutral and bias-free? Reply with JSON: {"neutral": true/false, "reason": "brief reason"}\nSummary: ${JSON.stringify(summary)}`;
  let lastValid = false;
  let retries = env.AI_MAX_RETRIES;

  while (retries >= 0) {
    try {
      const { content } = await claudeChat('You are an ethics validator.', prompt, { timeout: TIMEOUT });
      await storeTranscript(disputeId, 'VALIDATOR', 'CLAUDE', prompt, content, 0);
      const cleaned = content.replace(/```json?\s*/g, '').trim();
      const obj = JSON.parse(cleaned);
      lastValid = Boolean(obj.neutral);
      if (lastValid) return { valid: true, needsRegeneration: false };
      retries--;
    } catch (e) {
      logger.error('Ethic validator error', { error: e });
      retries--;
    }
  }

  return { valid: false, needsRegeneration: true };
}
