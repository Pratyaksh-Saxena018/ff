# FriendFi v4.1 Backend

Production backend for FriendFi — real-time AI-mediated conflict resolution with multi-AI orchestration, MongoDB Atlas, Socket.io, Redis, and JWT auth.

## Tech Stack

- **Runtime:** Node.js 18+ (TypeScript)
- **API:** Express.js
- **Real-time:** Socket.io + Redis adapter (multi-instance)
- **Database:** MongoDB Atlas, Mongoose
- **Cache/Queue:** Redis, BullMQ
- **AI:** OpenAI, Google Gemini, Anthropic Claude, Perplexity
- **Auth:** JWT, bcrypt
- **Validation:** Zod
- **Logging:** Winston

## Project Structure

```
src/
  config/       # env, database, redis
  models/       # Mongoose schemas (User, ChatMessage, Dispute, Vote, AITranscript, GameSession)
  routes/       # API routes
  controllers/  # Request handlers
  services/     # auth, message, dispute, karma, game
  ai/           # providers (openai, gemini, claude, perplexity), sentinel, mediation
  middlewares/  # auth, rate limit, validation, error
  sockets/      # Socket.io handler (auth, rooms, messageSent, disputeCreated, voteCast, etc.)
  jobs/         # BullMQ mediation queue
  utils/        # logger, validation schemas
  app.ts        # Express app
  server.ts     # HTTP server + Socket.io + startup
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster (connection string)
- Redis (local or hosted)
- API keys: OpenAI, Gemini, Claude, Perplexity (at least one for Sentinel; multiple for full mediation)

## Setup

1. **Clone and install**

   ```bash
   cd friendfi-backend
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   - `MONGODB_URI` — MongoDB Atlas URI
   - `JWT_SECRET` — min 32 characters
   - `REDIS_URL` — e.g. `redis://localhost:6379`
   - `OPENAI_KEY`, `GEMINI_KEY`, `CLAUDE_KEY`, `PERPLEXITY_KEY` (as many as you want)
   - `CORS_ORIGINS` — your Vercel frontend origin(s), comma-separated

3. **Build**

   ```bash
   npm run build
   ```

4. **Run**

   ```bash
   # Production
   npm start

   # Development (watch)
   npm run dev
   ```

   Server listens on `PORT` (default `4000`). Health: `GET /api/health`.

## API Overview

Base path: `/api`.

| Area        | Endpoints |
|------------|-----------|
| Auth       | `POST /auth/signup`, `POST /auth/login`, `GET /auth/profile` |
| Messages   | `POST /messages`, `GET /messages/room/:roomId` |
| Disputes   | `GET /disputes/:disputeId`, `GET /disputes/room/:roomId`, `POST /disputes/:disputeId/vote`, `POST /disputes/:disputeId/close-voting` |
| Leaderboard| `GET /leaderboard`, `GET /leaderboard/me` |
| Game       | `GET /game/matchmaking`, `POST /game/end`, `GET /game/history` |
| Health     | `GET /health` |

All protected routes use header: `Authorization: Bearer <token>`.

## Socket.io

Connect with auth:

```js
const socket = io('http://localhost:4000', {
  auth: { token: '<JWT>' },
  // or query: { token: '<JWT>' }
});
```

Events:

- **Client → Server:** `joinRoom(roomId)`, `leaveRoom(roomId)`, `sendMessage({ roomId, message })`, `voteCast({ disputeId, vote: 'FORGIVE'|'SANCTION' })`
- **Server → Client:** `messageSent`, `disputeCreated`, `courtModeActivated`, `userIsolated`, `aiProgressUpdate`, `caseReady`, `voteCast`, `verdictAnnounced`, `karmaUpdated`

## Postman

Import `postman/FriendFi-v4.1-API.postman_collection.json`. Set `baseUrl` to `http://localhost:4000/api`. Run Login; the script saves `token` for other requests.

## Flows (summary)

1. **Message pipeline:** Message stored → Sentinel (OpenAI + Gemini + Claude) → weighted toxicity; if &gt; threshold and ≥2/3 providers OK → create dispute.
2. **Isolation:** Bully → `reflection-{caseId}`, victim → `safety-{caseId}`; events `courtModeActivated`, `userIsolated`.
3. **Mediation:** Interview bully (intent/remorse) and victim (harm); AI Clerk summary; Claude ethic validator; then status `READY_FOR_VOTE`.
4. **DAO voting:** `caseReady` → 60s timer → collect votes → quorum check → `closeVotingAndApplyVerdict` → karma updates, `verdictAnnounced`, `karmaUpdated`.
5. **Karma:** FORGIVE (bully +5 if apology; jurors ± by alignment); SANCTION (bully -15, repeat multiplier; jurors +5 if aligned). Ranks: Observer → Juror (10) → Senior Juror (50) → Guardian (200).
6. **Game:** Matchmaking restricted if karma &lt; 300; XP after game with karma multiplier.

## License

Proprietary.
