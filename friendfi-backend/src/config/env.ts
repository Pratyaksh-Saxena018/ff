import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENAI_KEY: z.string().optional(),
  GEMINI_KEY: z.string().optional(),
  CLAUDE_KEY: z.string().optional(),
  PERPLEXITY_KEY: z.string().optional(),
  GROQ_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  VOTE_TIMER_SECONDS: z.string().transform(Number).default('60'),
  MIN_QUORUM_VOTES: z.string().transform(Number).default('3'),
  INITIAL_KARMA: z.string().transform(Number).default('100'),
  KARMA_FORGIVE_BULLY: z.string().transform(Number).default('10'),
  KARMA_SANCTION_BULLY: z.string().transform(Number).default('-10'),
  KARMA_JUROR_ALIGNED: z.string().transform(Number).default('10'),
  KARMA_JUROR_MISALIGNED: z.string().transform(Number).default('-10'),
  KARMA_VICTIM_RESTORED: z.string().transform(Number).default('10'),
  KARMA_MAX_DELTA: z.string().transform(Number).default('10'),
  REPEAT_OFFENDER_MULTIPLIER: z.string().transform(Number).default('1'),
  KARMA_SUSPEND_THRESHOLD: z.string().transform(Number).default('50'),
  KARMA_BAN_THRESHOLD: z.string().transform(Number).default('30'),
  SUSPENSION_DAYS: z.string().transform(Number).default('1'),
  TOXICITY_THRESHOLD: z.string().transform(Number).default('85'),
  AI_TIMEOUT_MS: z.string().transform(Number).default('15000'),
  AI_MAX_RETRIES: z.string().transform(Number).default('2'),
});

export type Env = z.infer<typeof envSchema>;

function normalizeEnv(processEnv: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const e = { ...processEnv } as Record<string, string | undefined>;
  if (e.MONGO_URL && !e.MONGODB_URI) e.MONGODB_URI = e.MONGO_URL;
  if (e.OPEN_API_KEY && !e.OPENAI_KEY) e.OPENAI_KEY = e.OPEN_API_KEY;
  if (e.GEMINI_API_KEY && !e.GEMINI_KEY) e.GEMINI_KEY = e.GEMINI_API_KEY;
  if (e.ANTHROPIC_API_KEY && !e.CLAUDE_KEY) e.CLAUDE_KEY = e.ANTHROPIC_API_KEY;
  if (e.GROQ_API_KEY && !e.GROQ_KEY) e.GROQ_KEY = e.GROQ_API_KEY;
  if (e.SECRET_KEY && !e.JWT_SECRET) e.JWT_SECRET = e.SECRET_KEY;
  return e;
}

function loadEnv(): Env {
  const normalized = normalizeEnv(process.env);
  const parsed = envSchema.safeParse(normalized);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}

export const env = loadEnv();
