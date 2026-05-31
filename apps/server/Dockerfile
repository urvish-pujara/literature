# --- build stage: install all deps + typecheck ---
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Copy workspace manifests first for cached dep install
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/

RUN pnpm install --frozen-lockfile --filter @literature/server... --prod=false

# Now copy sources
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/engine packages/engine
COPY apps/server apps/server

# Typecheck server + dependencies (defensive — catches drift in CI builds)
RUN pnpm --filter @literature/server typecheck

# --- runtime stage: prod deps only ---
FROM node:22-alpine AS runtime
WORKDIR /repo
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Copy minimal files for prod install
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/

RUN pnpm install --frozen-lockfile --filter @literature/server... --prod

# Sources (TS run via tsx at startup — no separate build step since the engine + shared are pure TS)
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/engine packages/engine
COPY apps/server apps/server

# Drop privileges
USER node

EXPOSE 4000
ENV HOST=0.0.0.0 PORT=4000

# tsx runs TS directly; for a slimmer image, swap to a separate `tsc` build step that emits JS.
CMD ["pnpm", "--filter", "@literature/server", "exec", "tsx", "src/index.ts"]
