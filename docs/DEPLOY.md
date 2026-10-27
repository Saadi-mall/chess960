# Hosting the live site: Vercel + Render + Supabase

This explains how the live site is hosted and how to set up your own copy. **You don't need
any of it to use or review the app.** For that, open the live site or run it locally with
Docker, as described in the [README](../README.md).

## What runs where

The live site is **https://chess960-rho.vercel.app**. All three services are on free plans,
and pushing to the `main` branch on GitHub redeploys the frontend and backend
automatically.

| Part | Host | Why there |
| --- | --- | --- |
| Frontend (the address you share) | Vercel | Serves the built React app, and forwards `/api` requests to the backend so the login cookie stays on the site's own domain |
| Backend (Java, Stockfish, WebSockets) | Render, at `https://chess960-backend.onrender.com` (Virginia) | Runs the same Docker image as local development. Vercel can't host a long-running server or WebSockets |
| Database | Supabase (AWS us-east-1) | Free Postgres that doesn't expire. Render's free Postgres is deleted after 30 days |

How requests flow:

- **Pages and API calls**: browser → Vercel → (`/api/*` forwarded) → Render. The browser
  only ever talks to the Vercel address, so the session cookie is an ordinary first-party
  cookie.
- **Live games**: browser → `wss://chess960-backend.onrender.com/ws/games/<id>` directly,
  because Vercel can't forward WebSockets. A game connection proves who it is with the seat
  token in its address, not with a cookie, so connecting across sites is safe.
  `ALLOWED_ORIGINS` still limits which sites can open one.
- **Database**: Render → Supabase over TLS (`sslmode=require`), through Supabase's session
  pooler.

## Free-plan limits

- **Render sleeps after 15 minutes without traffic.**
  - The next request waits about 30-60 seconds while it starts again.
  - Anything kept only in memory (live games, today's cached lesson) is cleared.
  - An open game pings the server every 4 minutes, so a game in progress keeps it awake.
  - To avoid the wait entirely, point a free uptime monitor (such as UptimeRobot or
    cron-job.org) at `https://chess960-backend.onrender.com/actuator/health` every 10
    minutes. Render's 750 free hours a month are enough for one service running
    constantly.
- **Supabase pauses a free project after a week with no activity.** Restore it from the
  Supabase dashboard. An uptime monitor also prevents this, because the health check
  queries the database.

## Setting up your own copy

Do these in order: the backend needs the database details, and the frontend needs the
backend's address.

### 1. Supabase (database)

1. Create a project. Choose a region close to the Render region you'll use, and save the
   database password.
2. In **Project Settings → Data API**, turn the Data API off. The app doesn't use it, and it
   would otherwise make tables reachable over HTTP. As a second safeguard, the app keeps its
   tables in their own `chess960` schema, which the Data API doesn't publish.
3. Click **Connect** (top bar) and choose **Session pooler**. Don't choose "Direct
   connection", which only works over IPv6, or "Transaction pooler". From the details shown,
   build these three values:
   - `DB_URL` = `jdbc:postgresql://<host>:5432/postgres?sslmode=require&currentSchema=chess960`
   - `DB_USER` = the pooler user, which looks like `postgres.<project-ref>`
   - `DB_PASSWORD` = the password from step 1

The tables are created automatically (by Flyway) the first time the backend starts. To see
them later, open **Table Editor** in Supabase and switch the schema dropdown from `public`
to `chess960`. Accounts are in the `users` table.

### 2. Render (backend)

1. Choose **New → Blueprint** and connect the GitHub repository. Render reads `render.yaml`
   from the repository root and creates the `chess960-backend` web service.
2. When asked, fill in `DB_URL`, `DB_USER` and `DB_PASSWORD` from step 1. The other
   settings come from `render.yaml`:
   - `DB_SCHEMA=chess960`: use the `chess960` schema.
   - `SECURE_COOKIE=true`: only send the login cookie over HTTPS.
   - `ALLOWED_ORIGINS=https://*.vercel.app`: which sites may open game connections.
   - `APP_BASE_URL`: the frontend's address, used in links inside emails.
3. Wait for the first deploy (the Docker build takes several minutes). Then open
   `https://<service>.onrender.com/actuator/health`, which should show `{"status":"UP"}`.
4. If the service address isn't exactly `https://chess960-backend.onrender.com`, put the
   real one in `frontend/vercel.json` (the `/api` rewrite) and use it for
   `VITE_BACKEND_WS_URL` in the next step.

### 3. Vercel (frontend)

1. Choose **Add New → Project** and import the GitHub repository.
2. Set **Root Directory** to `frontend`. The framework (Vite) and build settings come from
   `frontend/vercel.json`.
3. Add the environment variable `VITE_BACKEND_WS_URL` = `wss://<service>.onrender.com`,
   which tells the game page where to open its WebSocket connection.
4. Deploy. Game invite links look like `https://<project>.vercel.app/play/<game id>`.

If you later add a custom domain, add it to `ALLOWED_ORIGINS` on Render, separated by
commas, for example `https://*.vercel.app,https://chess960.example.com`.

### 4. Email confirmation (optional)

Without an email service, which is how the live site runs, signing up creates the account
and signs in straight away. To require new users to confirm their email address first,
connect [Brevo](https://www.brevo.com) (free plan: 300 emails a day). Sign-up then emails a
one-time link, and the account is only created when it's opened.

1. Create a Brevo account. Under **Senders, Domains & Dedicated IPs → Senders**, add and
   verify the address emails should come from.
2. Under **SMTP & API → API Keys**, generate an API key.
3. On Render, open `chess960-backend` → **Environment**, add `BREVO_API_KEY` (the key) and
   `MAIL_FROM_ADDRESS` (the verified sender), and save. If Render asks, choose to redeploy
   so the change takes effect.

## All backend settings

These are environment variables read by `backend/src/main/resources/application.yml`.
Every one has a default that works for local development.

| Variable | Default | What it does |
| --- | --- | --- |
| `DB_URL` | built from `DB_HOST`, `DB_PORT`, `DB_NAME` | Full JDBC address of the database |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | `localhost`, `5432`, `chess960` | Database address, used when `DB_URL` isn't set |
| `DB_USER`, `DB_PASSWORD` | `chess960`, `chess960` | Database login |
| `DB_SCHEMA` | `public` | Schema for the app's tables |
| `DB_POOL_SIZE` | `5` | Maximum database connections |
| `PORT` | `8080` | Port the backend listens on |
| `STOCKFISH_PATH` | `stockfish` | Path to the Stockfish program |
| `ALLOWED_ORIGINS` | `*` | Sites allowed to open game WebSocket connections |
| `SECURE_COOKIE` | `false` | Send the login cookie only over HTTPS. Turn on wherever HTTPS is used |
| `APP_BASE_URL` | `http://localhost:5173` | Frontend address used in emailed links |
| `BREVO_API_KEY`, `MAIL_FROM_ADDRESS` | empty | Turn on email confirmation for sign-up (both needed) |
| `MAIL_FROM_NAME` | `Chess960` | Sender name on emails |
| `LOG_EMAILS_WHEN_UNCONFIGURED` | `false` | With no email service, write confirmation links to the log instead of skipping confirmation. For trying that flow locally |
