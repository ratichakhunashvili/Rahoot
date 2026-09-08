# Container image for Cloud Run (or any container host). Runs the same
# custom Node/Socket.IO server as `npm start` locally - no source changes.
#
# Cloud Run injects PORT at runtime (server.ts already reads process.env.PORT,
# same as local dev), and env vars set on the Cloud Run service (DATABASE_URL,
# ADMIN_EMAIL, etc.) override anything baked in here at build time.
#
# Important: deploy with --max-instances=1. This app keeps live-game state
# (server.ts's `liveStates` Map) in the process's own memory - if Cloud Run
# ever scaled this to more than one instance, students could get routed to a
# different instance than their host and silently stop seeing updates.

FROM node:22-slim AS base
WORKDIR /app

# Install dependencies first (better layer caching). package-lock.json's
# postinstall (`prisma generate`) needs the schema present, and prisma.config.ts
# needs *a* DATABASE_URL to resolve even though generate doesn't connect to it -
# the real value is supplied by Cloud Run at runtime and overrides this.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ARG DATABASE_URL="postgresql://user:password@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL
RUN npm ci

# Now the rest of the source and build. devDependencies (tsx, cross-env,
# typescript, tailwind) stay installed - `npm start` runs the server via tsx,
# same as this project already does everywhere else (local dev, the Oracle VM
# deploy guide), so nothing is pruned before runtime.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
