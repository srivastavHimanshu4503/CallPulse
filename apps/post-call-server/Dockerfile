FROM node:20-slim
WORKDIR /app

# OpenSSL for Prisma engines
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/post-call-server/package.json ./apps/post-call-server/
COPY packages/ ./packages/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Prisma engines are platform-specific: the committed client was generated on
# macOS, so regenerate INSIDE the image (the schema lives in packages/db).
RUN pnpm --filter @antigravity/db exec prisma generate

COPY apps/post-call-server/ ./apps/post-call-server/

# Build the app AND all its workspace dependencies (db, types, errors, ...)
# in topological order. No `|| true` — a compile failure must fail the image
# build, not ship a crash-looping container.
RUN pnpm --filter "@antigravity/post-call-server..." build

CMD ["pnpm", "--filter", "@antigravity/post-call-server", "start"]
