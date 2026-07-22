FROM node:20-slim
WORKDIR /app

# OpenSSL for Prisma engines
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# patches/ holds pnpm patchedDependencies (declared in package.json) — install fails without it.
COPY patches/ ./patches/
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Prisma engines are platform-specific: the committed client was generated on
# macOS, so regenerate INSIDE the image (the schema lives in packages/db).
RUN pnpm --filter @antigravity/db exec prisma generate

COPY apps/api/ ./apps/api/

# Build the app AND all its workspace dependencies in topological order.
# No `|| true` — a compile failure must fail the image build.
RUN pnpm --filter "@antigravity/api..." build

EXPOSE 3000
CMD ["pnpm", "--filter", "@antigravity/api", "start"]
