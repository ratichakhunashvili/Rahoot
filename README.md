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

Because of the persistent Socket.IO connections, **this app needs a host that runs a normal long-lived Node process**. Plain Vercel-style serverless functions do not support the live-mode WebSocket connections. Two paths, depending on whether you want zero setup or zero cost - host pricing/free tiers change often, so double-check current terms before committing, but as of writing:

- **Render's free tier does not support WebSockets** (long-lived connections are a paid-plan feature there) - a dead end for this app.
- **Railway and Fly.io no longer have a real free tier** (trial credit only, then billed).
- **Koyeb** currently has a genuinely free web service that does support WebSockets - the only catch is it scales to zero after an hour with no traffic, so the first visitor after a lull waits ~10-20s for a cold start. Fine for a classroom tool used in bursts.

### Managed platform (Koyeb, Railway, Render, Fly.io, ...)

1. Provision a **hosted Postgres** database ([Neon](https://neon.com)'s free tier works well) and set `DATABASE_URL` to it. Keep `pgbouncer=true&connection_limit=5` on the connection string (see the comment in `.env.example`) - free/pooled Postgres tiers cap concurrent connections, and a live round's burst of simultaneous queries can exceed an uncapped default pool.
2. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a fresh random `SESSION_SECRET` (`openssl rand -base64 32`) in the host's environment variables - **don't reuse the local dev secret in production.**
3. Set `NEXT_PUBLIC_BASE_URL` to the public URL the host gives you (students' phones must be able to reach it).
4. Set the build command to `npm run build` (this also runs `prisma generate` via `postinstall`, and `prisma migrate deploy` should be run once against the production database - most hosts let you run this as a one-off release command).
5. Set the start command to `npm start`.

### Self-hosting on a free VM (e.g. Oracle Cloud "Always Free")

No cold starts, but real setup work - you're the sysadmin. `deploy/rahoot.service` and `deploy/Caddyfile` in this repo are ready-to-copy templates for steps 6-7.

1. **Create the VM.** Sign up for Oracle Cloud, then Compute → Instances → Create Instance. Change the shape to **Ampere → VM.Standard.A1.Flex** and set it to the full Always Free allowance (4 OCPU / 24GB RAM). Ubuntu is the simplest image to follow the rest of these steps with. The free Ampere shape's availability varies by region and moment - if creation fails with an out-of-capacity error, retry or try another region.
2. **Open the ports**, or requests never reach the VM:
   - OCI console: the VM's subnet → Security Lists (or a Network Security Group) → add ingress rules for TCP 80 and 443 from `0.0.0.0/0` (22 for SSH should already be there).
   - On the VM itself, Ubuntu images on OCI ship with `iptables` blocking everything but SSH by default:
     ```bash
     sudo apt install -y iptables-persistent
     sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
     sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
     sudo netfilter-persistent save
     ```
3. **Point a domain at it** - an A record to the VM's public IP. You need a real domain for HTTPS; Caddy (step 6) gets you a certificate automatically, but only for one.
4. **Install Node**, SSH'd into the VM:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs git
   ```
5. **Clone and configure the app:**
   ```bash
   git clone <your fork's URL> rahoot
   cd rahoot
   cp .env.example .env
   nano .env   # DATABASE_URL (e.g. Neon), ADMIN_EMAIL/PASSWORD, a fresh SESSION_SECRET, NEXT_PUBLIC_BASE_URL=https://your-domain
   npm ci
   npm run build
   npx prisma migrate deploy
   ```
6. **Run it as a service** so it survives SSH disconnects and reboots:
   ```bash
   sudo cp deploy/rahoot.service /etc/systemd/system/rahoot.service
   # edit WorkingDirectory / ExecStart in it if your paths differ
   sudo systemctl daemon-reload
   sudo systemctl enable --now rahoot
   ```
7. **Put HTTPS in front of it with Caddy** (auto-provisions and renews the Let's Encrypt cert):
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install -y caddy
   sudo cp deploy/Caddyfile /etc/caddy/Caddyfile   # edit the domain in it first
   sudo systemctl reload caddy
   ```
8. Visit `https://your-domain`, log in as admin, and host a test round from two devices to confirm the WebSocket connection works end-to-end through Caddy.

To ship a code update later: `git pull`, `npm ci`, `npm run build`, `sudo systemctl restart rahoot`.

## How scoring works

- **Multiple choice, self-paced homework**: a correct answer always scores the question's full point value.
- **Multiple choice, live session**: a correct answer scores between 50% and 100% of the question's point value, scaled by how quickly the student answered (Kahoot-style).
- **Paragraph answers**: never auto-graded. They show up under "Grade answers" in the admin panel (both modes) with the student's name and full response, where the admin picks correct/incorrect and a point value. The leaderboard updates immediately once graded.

## Notes on the "no authentication" design

Per the brief, students only ever provide a first and last name - there are no passwords, magic links, or accounts on the student side. This is intentionally low-friction, but it does mean a technically savvy student could, in principle, tamper with requests to submit answers under a different name. That trade-off was a deliberate choice for a fast, frictionless classroom tool rather than a security-hardened exam platform. The admin side, by contrast, is fully gated: every request under `/admin` (`src/proxy.ts`) is checked against a signed session cookie, and each server action re-checks the session again before touching any data.
