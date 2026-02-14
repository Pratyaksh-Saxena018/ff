# AI API Alternatives When Credits Run Low

FriendFi uses multiple AI providers for toxicity detection and mediation. When API credits are exhausted, consider these alternatives:

## Currently Integrated

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Groq** | ✅ Generous free tier | Fast inference, catches profanity well. Add `GROQ_KEY` to .env. |
| OpenAI | Limited | Moderation API has separate limits. |
| Google Gemini | Free tier available | May have rate limits. |
| Anthropic Claude | Limited | Trial credits, then paid. |

## Recommended Free/Low-Cost Alternatives

### 1. **Groq (Primary Fallback)** ✅ Already integrated
- **Sign up:** https://console.groq.com
- **Free tier:** 30 req/min, 14,400 req/day
- **Set:** `GROQ_KEY=gsk_...` in `.env`
- Good for profanity and cuss-word detection.

### 2. **Ollama (Local, 100% Free)**
- Run models locally: `ollama run llama3.2`
- No API keys, no credits.
- Requires local GPU or sufficient RAM.
- Can add a custom provider that calls `http://localhost:11434/api/generate`.

### 3. **Together.ai**
- Free tier with credits.
- OpenAI-compatible API: `https://api.together.xyz/v1`
- Add `TOGETHER_KEY` and use as OpenAI client with custom baseURL.

### 4. **Fireworks AI**
- Free tier available.
- OpenAI-compatible: `https://api.fireworks.ai/inference/v1`
- Good for Llama and other open models.

### 5. **Hugging Face Inference API**
- Free tier for many models.
- `https://api-inference.huggingface.co/models/...`
- Requires custom provider implementation.

### 6. **OpenRouter**
- Aggregates multiple models (Claude, Llama, etc.).
- Pay-as-you-go, can be cheaper than direct providers.
- `https://openrouter.ai/api/v1`

## Priority Order When Credits Are Low

1. **Groq** – Use first; free and fast.
2. **Gemini** – Often has free tier.
3. **OpenAI Moderation** – Separate from chat; may have remaining quota.
4. **Fallback profanity filter** – Built-in keyword filter runs when 2+ AI providers fail.

## Configuring Groq Only

To run with Groq as the sole AI provider:

```env
GROQ_KEY=gsk_your_key_here
# Leave OPENAI_KEY, GEMINI_KEY, CLAUDE_KEY empty or commented
```

The Sentinel will use Groq and the fallback profanity filter when Groq fails.
