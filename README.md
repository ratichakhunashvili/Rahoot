# Rahoot

A red & white, Kahoot-style quiz app with two strictly separate sides:

- **Admin panel** (`/admin`) - only reachable by the one hardcoded admin account. Create homeworks, add multiple-choice or paragraph questions, get a QR code + join code for each one, host a live session or leave it as self-paced homework, grade paragraph answers, and view the leaderboard.
- **Student side** - no login, no accounts. A student scans the QR code (or types the join code), enters just their first and last name, and plays. They can never reach `/admin` - it's blocked at the routing layer for anyone without a valid admin session.

Each homework is created in one of two modes, chosen by the admin:

- **Self-paced homework** - students join whenever and work through the questions on their own, like a normal assignment.
- **Live hosted session** - true Kahoot-style: the admin hosts a live round from the "Host live session" screen, every student answers the same question at the same time with a countdown, and scoring rewards faster correct answers.

## Tech stack

- **Next.js 16** (App Router) with a small **custom Node server** (`server.ts`) wrapping Next.js + **Socket.IO** - a custom server is required because live-mode gameplay needs persistent WebSocket connections, which plain serverless functions (e.g. Vercel) don't support.
- **PostgreSQL** via **Prisma** - all homeworks, questions, students and answers are stored there, so nothing is lost on a restart.
- **Tailwind CSS v4** for the red & white styling.
- Admin auth is a single hardcoded email/password pair (from environment variables) behind a signed session cookie - there's intentionally no user database, since there's only ever one admin.
- Student "sessions" are just a cookie remembering which student row is theirs for a given homework - not a real account, matching the "no authentication, just a name" requirement.

## Local development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start a local Postgres database.** Easiest option - Prisma's own local dev database, no Docker needed:
   ```bash
   npx prisma dev
   ```
   It prints a `DATABASE_URL` - leave that terminal running.
3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Paste the `DATABASE_URL` from step 2, and set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `SESSION_SECRET`.
4. **Run migrations**
   ```bash
   npm run db:migrate
   ```
5. **Start the app**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

Since QR codes just encode `NEXT_PUBLIC_BASE_URL + /join/<code>`, testing the QR flow from an actual phone on your Wi-Fi requires setting `NEXT_PUBLIC_BASE_URL` to your computer's LAN IP (e.g. `http://192.168.1.20:3000`) instead of `localhost`. In production, set it to your real public URL.

### End-to-end smoke test

`e2e/smoke.mjs` drives a real Chromium browser (via Playwright) through both game modes end-to-end - admin login, creating a homework, adding questions, a student joining and playing, grading, and the full live-hosted flow with two simulated participants. Run it against a running dev server:

```bash
npm run dev            # in one terminal
npm run test:e2e       # in another
```

It creates throwaway homeworks/students, so only point it at a local/dev database.

## Deploying

Because of the persistent Socket.IO connections, **this app needs a host that runs a normal long-lived Node process** - Railway, Render, Fly.io, or your own VPS all work well. Plain Vercel-style serverless functions do not support the live-mode WebSocket connections.

1. Provision a **hosted Postgres** database (Neon, Supabase, Railway/Render's managed Postgres, etc.) and set `DATABASE_URL` to it. Keep (or add) `?pgbouncer=true` on the connection string if your provider gives you a pooled connection URL - see the comment in `.env.example`.
2. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a fresh random `SESSION_SECRET` (`openssl rand -base64 32`) in the host's environment variables - **don't reuse the local dev secret in production.**
3. Set `NEXT_PUBLIC_BASE_URL` to the public URL the host gives you (students' phones must be able to reach it).
4. Set the build command to `npm run build` (this also runs `prisma generate` via `postinstall`, and `prisma migrate deploy` should be run once against the production database - most hosts let you run this as a one-off release command).
5. Set the start command to `npm start`.

## How scoring works

- **Multiple choice, self-paced homework**: a correct answer always scores the question's full point value.
- **Multiple choice, live session**: a correct answer scores between 50% and 100% of the question's point value, scaled by how quickly the student answered (Kahoot-style).
- **Paragraph answers**: never auto-graded. They show up under "Grade answers" in the admin panel (both modes) with the student's name and full response, where the admin picks correct/incorrect and a point value. The leaderboard updates immediately once graded.

## Notes on the "no authentication" design

Per the brief, students only ever provide a first and last name - there are no passwords, magic links, or accounts on the student side. This is intentionally low-friction, but it does mean a technically savvy student could, in principle, tamper with requests to submit answers under a different name. That trade-off was a deliberate choice for a fast, frictionless classroom tool rather than a security-hardened exam platform. The admin side, by contrast, is fully gated: every request under `/admin` (`src/proxy.ts`) is checked against a signed session cookie, and each server action re-checks the session again before touching any data.
