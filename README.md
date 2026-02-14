# FriendFi v4.1

AI-mediated real-time chat platform with conflict resolution, group chat, karma, leaderboard, and court-style DAO voting. Detects cyberbullying and toxic content using multi-AI orchestration (OpenAI, Gemini, Claude, Perplexity), mediates disputes, and lets the community vote on outcomes.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Socket.io Events](#socketio-events)
- [Database Schemas](#database-schemas)
- [Key Flows](#key-flows)
- [Postman](#postman)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Auth:** Sign up, login, JWT, protected routes, profile
- **Real-time chat:** Socket.io, per-room messages, instant sync across group members
- **Groups:** Create groups with auto-generated invite codes; join via invite code (persisted in MongoDB)
- **AI moderation (Sentinel):** Every message is analyzed by OpenAI, Gemini, and Claude; weighted toxicity score; triggers dispute when score > 85% (and ≥2/3 providers succeed)
- **AI intervention:** Disputes open court mode; bully moved to Reflection Room, victim to Safe Space; multi-AI mediation pipeline
- **DAO voting:** Blind jury votes FORGIVE or SANCTION; 60s timer; quorum; karma applied on verdict
- **Karma & leaderboard:** Initial karma 500; jurors gain/lose by vote alignment; bully gains/loses by verdict; ranks: Observer → Juror (10) → Senior Juror (50) → Guardian (200)
- **Game integration:** Matchmaking restricted if karma < 300; XP distributed after games with karma multiplier

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js) - localhost:3000                             │
│  • Login / Signup / Dashboard / Chat / Court / Profile           │
│  • Socket.io client (token auth)                                 │
│  • REST API client (lib/api.ts)                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│  BACKEND (Express + Socket.io) - localhost:4000                  │
│  • REST: /api/auth, /api/groups, /api/messages, /api/disputes…   │
│  • Socket: joinRoom, sendMessage, voteCast                       │
│  • AI: Sentinel, Mediation (OpenAI, Gemini, Claude, Perplexity)  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   MongoDB Atlas         Redis              AI APIs
   (Users, Groups,       (pub/sub,          (OpenAI,
    Messages, Disputes,   BullMQ)            Gemini,
    Votes, etc.)                             Claude,
                                             Perplexity)
```

---

## Tech Stack

| Layer      | Technologies |
|-----------|--------------|
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI, Socket.io client, Sonner |
| Backend   | Node.js 18+, Express, TypeScript, Socket.io, Redis adapter |
| Database  | MongoDB Atlas, Mongoose |
| Cache/Queue | Redis, BullMQ |
| AI        | OpenAI, Google Gemini, Anthropic Claude, Perplexity |
| Auth      | JWT, bcrypt |
| Validation | Zod |
| Logging   | Winston |

---

## Project Structure

```
friendfi/
├── app/                    # Next.js App Router
│   ├── login/page.tsx      # Login
│   ├── signup/page.tsx     # Sign up
│   ├── dashboard/page.tsx  # Main app (chat, court, profile)
│   ├── layout.tsx
│   └── page.tsx            # Root → redirect to /login
├── components/
│   ├── top-nav.tsx         # Header, karma, logout
│   ├── group-sidebar.tsx   # Groups, create, join
│   ├── chat-panel.tsx      # Messages, send
│   ├── justice-dashboard.tsx # Court mode, voting
│   ├── ai-council.tsx      # AI agents status
│   ├── profile-panel.tsx   # User profile
│   └── game-panel.tsx      # Game XP, level
├── lib/
│   ├── api.ts              # REST client, auth helpers
│   ├── useChatSocket.ts    # Socket.io hook (messages, disputes)
│   └── store.ts            # Types, mock data
├── .env.local.example
├── README.md
├── RUN.md                  # Quick run guide
│
└── friendfi-backend/
    ├── src/
    │   ├── config/         # env, database, redis
    │   ├── models/         # User, Group, ChatMessage, Dispute, Vote, AITranscript, GameSession
    │   ├── routes/         # auth, messages, groups, disputes, leaderboard, game
    │   ├── controllers/
    │   ├── services/       # auth, message, group, dispute, karma, game
    │   ├── ai/             # providers, sentinel, mediation
    │   ├── middlewares/    # auth, rate limit, validation, error
    │   ├── sockets/        # Socket.io handler
    │   ├── jobs/           # BullMQ mediation queue
    │   ├── utils/          # logger, validation
    │   ├── app.ts
    │   └── server.ts
    ├── postman/            # Postman collection
    ├── .env.example
    └── README.md
```

---

## Prerequisites

- **Node.js** 18+
- **MongoDB Atlas** (or other MongoDB) — connection string
- **Redis** — for Socket.io pub/sub and BullMQ (local or hosted)
- **AI API keys** (at least one for Sentinel): OpenAI, Google Gemini, Anthropic Claude, Perplexity

---

## Environment Variables

### Backend (`friendfi-backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Min 32 characters |
| `REDIS_URL` | Yes | e.g. `redis://localhost:6379` |
| `OPENAI_KEY` | No* | OpenAI API key |
| `GEMINI_KEY` | No* | Google Gemini API key |
| `CLAUDE_KEY` | No* | Anthropic Claude API key |
| `PERPLEXITY_KEY` | No* | Perplexity API key |
| `PORT` | No | Default 4000 |
| `CORS_ORIGINS` | No | Comma-separated frontend origins |
| `JWT_EXPIRES_IN` | No | Default 7d |
| `TOXICITY_THRESHOLD` | No | 0–100, default 85 |
| `VOTE_TIMER_SECONDS` | No | Default 60 |
| `MIN_QUORUM_VOTES` | No | Default 3 |
| `INITIAL_KARMA` | No | Default 500 |

\* At least one AI key needed for Sentinel; more for full mediation.

Aliases supported: `MONGO_URL`, `OPEN_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `SECRET_KEY`.

### Frontend (`.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend URL, default `http://localhost:4000` |

---

## Installation & Setup

### 1. Clone and install backend

```bash
cd friendfi-backend
npm install
cp .env.example .env
# Edit .env with MONGODB_URI, JWT_SECRET, REDIS_URL, AI keys
```

### 2. Install frontend

```bash
# From repo root
npm install
# or: pnpm install
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Start Redis (required for backend)

**WSL (Ubuntu):**
```bash
sudo apt install redis-server -y
sudo service redis-server start
```

**macOS:** `brew install redis && brew services start redis`

---

## Running the Application

### Development

**Terminal 1 — Backend:**
```bash
cd friendfi-backend
npm run dev
```
Wait for: `FriendFi backend listening on port 4000` and `MongoDB Atlas connected`.

**Terminal 2 — Frontend:**
```bash
# From repo root
npm run dev
# or: pnpm dev
```
Wait for: `Ready on http://localhost:3000`.

**Browser:** Open `http://localhost:3000` → sign up → log in → create/join groups → chat.

### Production

```bash
# Backend
cd friendfi-backend && npm run build && npm start

# Frontend
npm run build && npm start
```

---

## API Reference

Base URL: `http://localhost:4000/api` (or your backend URL).  
Protected routes: `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/auth/signup` | `{ username, email, password }` | Create account |
| POST | `/auth/login` | `{ email, password }` | Login, returns `{ user, token }` |
| GET | `/auth/profile` | — | Get current user (requires auth) |

### Groups
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/groups` | — | List groups user belongs to |
| POST | `/groups` | `{ name, description?, type?, isPrivate? }` | Create group |
| POST | `/groups/join` | `{ inviteCode }` | Join group by invite code |

### Messages
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/messages` | `{ roomId, message }` | Send message (also via Socket) |
| GET | `/messages/room/:roomId` | — | Get messages for room |

### Disputes
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/disputes/:disputeId` | — | Get dispute |
| GET | `/disputes/room/:roomId` | — | Get active disputes for room |
| POST | `/disputes/:disputeId/vote` | `{ vote: "FORGIVE" \| "SANCTION" }` | Cast vote |
| POST | `/disputes/:disputeId/close-voting` | — | Close voting (admin/automation) |

### Leaderboard
| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/leaderboard` | `?limit=50` | Top users by karma |
| GET | `/leaderboard/me` | — | Current user's rank |

### Game
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/game/matchmaking` | — | Matchmaking status (karma check) |
| POST | `/game/end` | `{ playerIds, result? }` | End game, distribute XP |
| GET | `/game/history` | — | User's game history |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## Socket.io Events

**Connect:** `io(url, { auth: { token } })`

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `roomId` | Join chat room |
| `leaveRoom` | `roomId` | Leave room |
| `sendMessage` | `{ roomId, message }` | Send message (triggers Sentinel) |
| `voteCast` | `{ disputeId, vote: "FORGIVE" \| "SANCTION" }` | Cast vote |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `messageSent` | `{ messageId, roomId, senderId, senderUsername, message, flagged?, disputeCreated?, … }` | New message broadcast |
| `disputeCreated` | `{ dispute }` | Dispute opened |
| `courtModeActivated` | `{ disputeId, caseNumber }` | Court mode on |
| `userIsolated` | `{ room, role: "bully" \| "victim", disputeId }` | User moved to reflection/safety |
| `aiProgressUpdate` | `{ disputeId, stage }` | Mediation progress |
| `caseReady` | `{ disputeId }` | Ready for voting |
| `voteCast` | `{ disputeId, voterId, vote }` | Vote recorded |
| `verdictAnnounced` | `{ disputeId, verdict }` | Verdict applied |
| `karmaUpdated` | `{ disputeId }` | Karma updated |

---

## Database Schemas

- **User:** username, email, passwordHash, karmaScore, juryAccuracy, gameXP, juryRank, totalCasesParticipated, totalSanctionsReceived, totalApologiesGiven, reputationHistory
- **Group:** name, description, inviteCode (unique), members[], createdBy, type, isPrivate
- **ChatMessage:** roomId, senderId, message, toxicityScore, flagged, createdAt
- **Dispute:** caseNumber, bullyId, victimId, roomId, triggerType, status, aiSummary, finalVerdict, sanctionType, remorseScore, harmLevel, apologyOffered
- **Vote:** disputeId, voterId, vote (FORGIVE|SANCTION)
- **AITranscript:** disputeId, role, provider, input, output, tokensUsed
- **GameSession:** players[], result, xpDistributed, startedAt, endedAt

---

## Key Flows

### 1. Message → Sentinel
Message sent → stored in DB → parallel OpenAI + Gemini + Claude toxicity check → weighted score. If score > 85% and ≥2/3 providers succeed → create Dispute. If &lt;2/3 succeed → human review, no auto-dispute.

### 2. Dispute → Isolation
Dispute created → bully joins `reflection-{caseId}`, victim joins `safety-{caseId}` → `courtModeActivated`, `userIsolated` emitted.

### 3. Mediation Pipeline
Interview bully (intent, remorse) and victim (harm) with multi-AI → AI Clerk summarizes → Claude ethic validator checks neutrality → status `READY_FOR_VOTE`.

### 4. DAO Voting
`caseReady` emitted → 60s timer → jurors vote FORGIVE or SANCTION → quorum check → verdict applied → karma updated → `verdictAnnounced`, `karmaUpdated` emitted.

### 5. Karma
- FORGIVE + apology: bully +5; jurors aligned +3, misaligned -1.
- SANCTION: bully -15 (repeat offender multiplier); jurors aligned +5.

### 6. Groups
Create group → backend generates invite code → stored in MongoDB. Other users join via `POST /groups/join` with code → added to members → group appears in sidebar.

---

## Postman

Import `friendfi-backend/postman/FriendFi-v4.1-API.postman_collection.json`. Set variable `baseUrl` = `http://localhost:4000/api`. Run **Login**; the script saves `token` for other requests.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ERR_CONNECTION_REFUSED` | Start frontend (`npm run dev`) and/or backend (`cd friendfi-backend && npm run dev`). |
| `TypeError: Cannot read properties of undefined (reading 'find')` | Mongoose model not loaded. Ensure model exported in `friendfi-backend/src/models/index.ts` and imported in services. |
| Sentinel / AI errors (429, 404, credits) | Rate limits or billing; messages go to human review. Check API keys and quotas. |
| Redis connection failed | Start Redis (WSL: `sudo service redis-server start`). |
| Invalid invite code | Ensure backend is running; groups are stored in MongoDB. Both users must use same backend. |
| Login/signup network error | Backend not running or `NEXT_PUBLIC_API_URL` wrong. |

For a shorter run guide, see **[RUN.md](RUN.md)**.

---

## License

Proprietary.
