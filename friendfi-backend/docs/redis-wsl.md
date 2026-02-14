# Install and run Redis in WSL (Ubuntu)

## 1. Install Redis

In your WSL terminal (Ubuntu), run:

```bash
sudo apt update
sudo apt install redis-server -y
```

## 2. Start Redis

Start the Redis service:

```bash
sudo service redis-server start
```

Check that it’s running:

```bash
redis-cli ping
```

You should see: **PONG**

## 3. (Optional) Start Redis on boot in WSL

If you want Redis to start whenever you open WSL:

```bash
echo "sudo service redis-server start" >> ~/.bashrc
```

Or run `sudo service redis-server start` manually each time you open WSL.

## 4. Use it with FriendFi backend

Leave this WSL terminal open (or just have Redis running), then in **Windows** (PowerShell or CMD) or another terminal:

```bash
cd friendfi-backend
npm run dev
```

Your backend’s `.env` has `REDIS_URL=redis://localhost:6379`. When the backend runs on Windows, it connects to `localhost:6379`. WSL2 shares the same `localhost` as Windows, so the backend on Windows can connect to Redis running in WSL.

If the backend runs **inside WSL** (e.g. you `cd friendfi-backend` in WSL and run `npm run dev` there), then `localhost:6379` in WSL is the same Redis you just started.

---

**Quick reference**

| Command | Purpose |
|--------|--------|
| `sudo service redis-server start` | Start Redis |
| `sudo service redis-server stop` | Stop Redis |
| `redis-cli ping` | Test connection (expect `PONG`) |
