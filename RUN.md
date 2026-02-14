# FriendFi – How to run (fix "localhost refused to connect")

**ERR_CONNECTION_REFUSED** means no app is running on that port. Start the servers first.

---

## Option A: Run the **frontend** (login/signup pages in the browser)

The app you see in the browser runs on **port 3000** by default.

1. Open a terminal in the **project root** (the folder that contains `app/`, `components/`, `package.json` — e.g. `D:\friendfiC`).
2. Install and start:
   ```bash
   npm install
   npm run dev
   ```
   (Or `pnpm install` then `pnpm dev` if you use pnpm.)
3. Wait until you see something like: **Ready on http://localhost:3000**
4. In your browser open: **http://localhost:3000**

You should see the app (e.g. redirect to login). If you still get "refused", check that no other program is using port 3000 and that the terminal didn’t show an error.

---

## Option B: Run the **backend** (API for login/signup)

The API runs on **port 4000**. You need this running when you use **Login** or **Sign up** in the frontend.

1. Start **Redis** (in WSL):
   ```bash
   sudo service redis-server start
   ```
2. Open a **second** terminal and go to the backend folder:
   ```bash
   cd friendfi-backend
   npm install
   npm run dev
   ```
3. Wait until you see: **FriendFi backend listening on port 4000** (and MongoDB connected).
4. Test in browser: **http://localhost:4000/api/health**  
   You should see JSON like `{"success":true,"status":"ok",...}`.

---

## Run both (recommended for full app)

Use **two terminals**:

| Terminal 1 (backend)        | Terminal 2 (frontend)     |
|-----------------------------|---------------------------|
| `cd friendfi-backend`       | (stay in project root)    |
| `npm run dev`               | `npm run dev`             |
| Wait for "port 4000"        | Wait for "localhost:3000" |

Then open: **http://localhost:3000**  
Use **http://localhost:3000/login** to sign in or sign up (backend must be running for auth to work).

---

## Quick checklist

- [ ] Backend: `cd friendfi-backend` → `npm run dev` → see "listening on port 4000"
- [ ] Frontend: in project root → `npm run dev` → see "localhost:3000"
- [ ] Browser: open **http://localhost:3000** (not 4000 for the UI)
- [ ] Redis: if backend fails on Redis, start it in WSL: `sudo service redis-server start`

If you only start the frontend, **http://localhost:3000** will load but login/signup will fail with a network error until the backend is running.
