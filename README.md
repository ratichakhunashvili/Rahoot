# Rahoot

A black & orange, Kahoot-style quiz app with no registration required to create or play a quiz:

- **Anyone can create a homework** - no login, just a title. The creator gets a QR code + join code, adds multiple-choice or paragraph questions, and chooses whether it's a live hosted session or self-paced homework. A signed cookie remembers which homeworks a given browser created, so only that creator (or the admin) can edit/host/delete it later.
- **Students** - no login either. Scan the QR code (or type the join code), enter a first and last name, and play.
- **Admin panel** (`/admin`) - one hardcoded account, for oversight: it can see, manage, and delete every homework ever created, on top of whatever a regular creator can do for their own.

Each homework is created in one of two modes:

- **Self-paced homework** - students join whenever and work through the questions on their own, like a normal assignment.
- **Live hosted session** - true Kahoot-style: the creator hosts a live round from the "Host live session" screen, every student answers the same question at the same time with a countdown, and scoring rewards faster correct answers.

## Tech stack

- **Next.js 16** (App Router), deployed as a normal Vercel project - no custom server.
- **PostgreSQL via Supabase**, queried through **Prisma**.
- **Supabase Realtime** (broadcast channels) drives live-mode sync - the host and every student's browser subscribe to a per-homework channel, and Server Actions broadcast phase/lobby/answer-count changes to it. There's no in-memory game state anywhere: `Homework.livePhase` / `currentQuestionIndex` / `questionStartedAt` in Postgres are the only source of truth (see `src/lib/live-game.ts`), which is what makes this safe to run on stateless serverless functions with no instance affinity between requests.
- **Tailwind CSS v4** for the styling.
- Admin auth is a single hardcoded email/password pair (from environment variables) behind a signed session cookie - there's intentionally no admin user database, since there's only ever one admin.
- Both a homework creator's and a student's "sessions" are just a cookie remembering which row is theirs - not a real account, matching the "no authentication" requirement.

## Local development

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create a [Supabase](https://supabase.com) project** (free tier is fine). You'll need, from Project Settings:
   - Database → Connection string: the pooled one for `POSTGRES_PRISMA_URL`, the direct (non-pooled) one for `POSTGRES_URL_NON_POOLING` - Prisma migrations need a direct connection.
   - API → Project URL for `NEXT_PUBLIC_SUPABASE_URL`, the `anon` public key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the `service_role` secret key for `SUPABASE_SERVICE_ROLE_KEY` (server-only - never expose this one to the browser).
3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in the Supabase values from step 2, plus `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `SESSION_SECRET`.
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

This is a plain Next.js app - no custom server, no persistent connections to host - so it deploys to **Vercel** like any other Next.js project, with **Supabase** providing both Postgres and the live-mode realtime channel:

1. **Provision Supabase** via the Vercel Marketplace (`vercel integration add supabase`, or the Storage tab in the Vercel dashboard) so the database and API env vars below get injected into the project automatically. Alternatively, create the Supabase project yourself and add the env vars by hand.
2. **Set environment variables** on the Vercel project (Project Settings → Environment Variables), for Production (and Preview, if you want preview deploys to work too):
   - `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` - Supabase's pooled and direct Postgres connection strings.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - from Supabase's API settings.
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a fresh random `SESSION_SECRET` (`openssl rand -base64 32`) - **don't reuse the local dev secret in production.**
   - `NEXT_PUBLIC_BASE_URL` - your Vercel production URL (students' phones must be able to reach it; used to build QR code join links).
3. **Run the migration once** against the production database - either `vercel env pull && npx prisma migrate deploy` locally, or add it as a build step.
4. Push to the branch Vercel is watching (or `vercel deploy --prod`). Vercel builds with `npm run build` and serves it - no start command to configure.

There's no `--max-instances=1` concern here the way there would be with an in-memory game-state server: live-game state lives entirely in Postgres (see `src/lib/live-game.ts`), and Supabase Realtime - not app-server memory - is what fans updates out to every connected browser. Any number of Vercel Function instances can handle requests for the same homework at once.

## How scoring works

- **Multiple choice, self-paced homework**: a correct answer always scores the question's full point value.
- **Multiple choice, live session**: a correct answer scores between 50% and 100% of the question's point value, scaled by how quickly the student answered (Kahoot-style).
- **Paragraph answers**: never auto-graded. They show up under "Grade answers" in the admin panel (both modes) with the student's name and full response, where the admin picks correct/incorrect and a point value. The leaderboard updates immediately once graded.

## Notes on the "no authentication" design

Per the brief, students only ever provide a first and last name - there are no passwords, magic links, or accounts on the student side. This is intentionally low-friction, but it does mean a technically savvy student could, in principle, tamper with requests to submit answers under a different name. That trade-off was a deliberate choice for a fast, frictionless classroom tool rather than a security-hardened exam platform. The admin side, by contrast, is fully gated: every request under `/admin` (`src/proxy.ts`) is checked against a signed session cookie, and each server action re-checks the session again before touching any data.
