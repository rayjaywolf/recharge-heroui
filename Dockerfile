# Recharge API (Hono) — built from the pnpm monorepo root for Koyeb / any container host.
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@11.1.1 --activate

WORKDIR /app

# Install workspace dependencies (layer cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# Application source (API + shared packages only)
COPY apps/api apps/api
COPY packages packages

WORKDIR /app/apps/api

ENV NODE_ENV=production

# Koyeb sets PORT at runtime (defaults to 8000 on Koyeb)
EXPOSE 8000

CMD ["pnpm", "start"]
