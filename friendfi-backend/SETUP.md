# FriendFi Backend – Download & Run

## 1. Get the project

The backend lives in the **`friendfi-backend`** folder in your project.

- **If you’re in Cursor/VS Code:** the folder is already part of your workspace (e.g. `friendfi-backend/` at the project root).
- **If the project is on another machine:** copy the whole project (including the `friendfi-backend` folder) via USB, cloud drive, or git clone.

## 2. Install Node.js

- Install **Node.js 18 or newer**: https://nodejs.org/
- In a terminal, check:
  ```bash
  node -v
  npm -v
  ```

## 3. Install Redis (needed for real-time chat)

Socket.io and queues use Redis. Install one of:

- **Windows:** [Memurai](https://www.memurai.com/) (Redis-compatible) or [WSL](https://docs.microsoft.com/en-us/windows/wsl/) and then Redis inside WSL.
- **macOS:** `brew install redis` then `brew services start redis`.
- **Linux:** `sudo apt install redis-server` (or your distro’s package) and start the `redis-server` service.

Or use a **cloud Redis** (e.g. [Upstash](https://upstash.com/)) and set `REDIS_URL` in `.env` to that URL.

## 4. Configure environment (keys are already wired)

Your keys are already set in **`friendfi-backend/.env`** with these mappings:

| Your variable      | Backend variable | Used for        |
|--------------------|------------------|-----------------|
| `MONGO_URL`        | `MONGODB_URI`    | MongoDB Atlas   |
| `OPEN_API_KEY`     | `OPENAI_KEY`     | OpenAI          |
| `GEMINI_API_KEY`   | `GEMINI_KEY`     | Google Gemini   |
| `ANTHROPIC_API_KEY`| `CLAUDE_KEY`     | Anthropic Claude|
| `SECRET_KEY`       | `JWT_SECRET`     | JWT (min 32 chars) |

- **JWT:** The app needs a secret of at least 32 characters. In `.env`, `JWT_SECRET` is set to an extended value; you can change it to any string ≥ 32 chars.
- **Optional:** Add `PERPLEXITY_KEY` in `.env` if you use Perplexity.

**Important:** Do **not** commit `.env` or share it. It’s in `.gitignore`. If these keys were ever exposed in chat or in a repo, rotate them in each provider’s dashboard.

## 5. Install dependencies and run

In a terminal, from the **project root** (parent of `friendfi-backend`):

```bash
cd friendfi-backend
npm install
npm run dev
```

Or from **inside** `friendfi-backend`:

```bash
npm install
npm run dev
```

- **`npm run dev`** – runs the server with auto-reload (good for development).
- **`npm run build`** then **`npm start`** – production build and run.

You should see something like:

```
FriendFi backend listening on port 4000
MongoDB Atlas connected
```

## 6. Check that it’s running

- **Health:** Open in browser or curl:  
  `http://localhost:4000/api/health`  
  You should get JSON: `{"success":true,"status":"ok",...}`

- **Sign up:**  
  `POST http://localhost:4000/api/auth/signup`  
  Body (JSON): `{"username":"testuser","email":"test@example.com","password":"password123"}`

- **Login:**  
  `POST http://localhost:4000/api/auth/login`  
  Body: `{"email":"test@example.com","password":"password123"}`  
  Use the returned `token` in the `Authorization: Bearer <token>` header for other APIs.

## 7. Frontend (Next.js / Vercel)

- **Backend URL:** In the **frontend** project root, create `.env.local` (see repo root `.env.local.example`) and set:
  - `NEXT_PUBLIC_API_URL=http://localhost:4000` (local backend) or your deployed backend URL.
- The login and signup pages call `POST /api/auth/login` and `POST /api/auth/signup` on that URL. Ensure the backend is running and CORS allows your frontend origin.
- **Socket.io URL:** same host as the API (e.g. `http://localhost:4000`), no `/api` path.
- In the backend `.env`, `CORS_ORIGINS` already includes `http://localhost:3000` and `http://localhost:5173`. Add your Vercel URL when you deploy (e.g. `https://your-app.vercel.app`).

## Troubleshooting

| Issue | What to do |
|-------|------------|
| “MONGODB_URI is required” | Ensure `friendfi-backend/.env` exists and has `MONGODB_URI=...` (or `MONGO_URL=...`). |
| “Invalid environment configuration” / JWT | Make sure `JWT_SECRET` has at least 32 characters. |
| Redis connection errors | Start Redis locally or set `REDIS_URL` to a valid Redis URL. |
| Port 4000 in use | Set `PORT=4001` (or another port) in `.env`. |
| CORS errors from frontend | Add your frontend origin to `CORS_ORIGINS` in `.env` (comma-separated). |

---

**Quick recap:**  
`cd friendfi-backend` → `npm install` → `npm run dev` → open `http://localhost:4000/api/health`.
