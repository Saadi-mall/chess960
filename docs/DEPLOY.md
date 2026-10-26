# Deploying: Vercel + Render + Supabase (all free tiers)

Currently live at **https://chess960-rho.vercel.app**, with the backend at
`https://chess960-backend.onrender.com` (Render, Virginia) and the database on Supabase
(us-east-1). Pushing to `main` redeploys both automatically.

| Part | Host | Why there |
| --- | --- | --- |
| Frontend (the link you share) | Vercel | Static site; forwards `/api` to the backend so the login cookie stays first-party |
| Backend (Java, Stockfish, WebSockets) | Render, free web service | Runs the existing Docker image; Vercel can't run a long-lived server or WebSockets |
| Database | Supabase, free Postgres | Doesn't expire (Render's free Postgres is deleted after 30 days) |

Free-tier limits to know about:

- **Render sleeps after 15 minutes without traffic.** The next visit waits ~30-60s while it
  wakes up, and anything only in memory (live games, today's cached lesson) is lost. Live
  games send a keep-alive ping every 4 minutes, so a game in progress doesn't count as idle.
  To avoid the wake-up wait entirely, point a free uptime monitor (e.g. cron-job.org or
  UptimeRobot) at `https://<backend>/actuator/health` every 10 minutes; Render's 750 free
  hours a month cover one service running all month.
- **Supabase pauses a free project after a week with no activity.** Restore it from the
  dashboard. The uptime monitor above also keeps it active, since the health check queries
  the database.

## 1. Supabase (database)

1. Create a project. Pick a region near the Render region you'll use; save the database
   password somewhere safe.
2. **Project Settings → Data API:** turn the Data API off. This app doesn't use it, and it
   would otherwise expose tables over HTTP. (The app also keeps its tables in their own
   `chess960` schema, which the Data API doesn't publish, as a second safeguard.)
3. **Connect** (top bar) → **Session pooler** (not "Direct connection", which is IPv6-only,
   and not "Transaction pooler"). Note the host, port, database and user. You'll need:
   - `DB_URL` = `jdbc:postgresql://<host>:5432/postgres?sslmode=require&currentSchema=chess960`
   - `DB_USER` = the pooler user, which looks like `postgres.<project-ref>`
   - `DB_PASSWORD` = the database password from step 1

## 2. Render (backend)

1. **New → Blueprint**, connect the GitHub repo. Render reads `render.yaml` from the repo
   root and creates the `chess960-backend` web service.
2. Fill in `DB_URL`, `DB_USER` and `DB_PASSWORD` from step 1 when asked. The other settings
   (`DB_SCHEMA`, `SECURE_COOKIE`, `ALLOWED_ORIGINS`) come from `render.yaml`.
3. Wait for the first deploy (the Docker build takes several minutes), then open
   `https://<service>.onrender.com/actuator/health`; it should say `{"status":"UP"}`.
4. If the service URL isn't exactly `https://chess960-backend.onrender.com`, put the real
   one in `frontend/vercel.json` (the `/api` rewrite) and use it for `VITE_BACKEND_WS_URL`
   below.

## 3. Vercel (frontend)

1. **Add New → Project**, import the GitHub repo.
2. **Root Directory:** `frontend`. The framework (Vite) and build settings come from
   `frontend/vercel.json`.
3. **Environment variable:** `VITE_BACKEND_WS_URL` = `wss://<service>.onrender.com` (game
   WebSockets connect straight to Render, since Vercel can't proxy them).
4. Deploy. Your shareable links are `https://<project>.vercel.app/play/<game id>`.

If you later add a custom domain, add it to `ALLOWED_ORIGINS` on Render
(comma-separated, e.g. `https://*.vercel.app,https://chess960.example.com`).

## How the pieces connect

- Page and REST calls: browser → Vercel → (rewrite) `/api/*` → Render. Because the browser
  only ever talks to the Vercel domain for `/api`, the session cookie is a normal
  first-party cookie.
- Live games: browser → `wss://<service>.onrender.com/ws/games/<id>?token=...` directly. A
  socket authenticates with the seat token in its URL, not a cookie, so cross-site
  connections are safe; `ALLOWED_ORIGINS` still limits which sites may open one.
- Render → Supabase over TLS (`sslmode=require`), through Supabase's session pooler.
