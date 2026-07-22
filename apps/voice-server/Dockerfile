FROM node:20-slim
WORKDIR /app

# OpenSSL for Prisma engines; python3/make/g++ for any native module builds
# (onnxruntime for Silero VAD ships prebuilt binaries, but keep the toolchain
# so a fallback source build never breaks the image).
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer caching. patches/ holds pnpm
# patchedDependencies (declared in package.json) — install fails without it.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/
COPY apps/voice-server/package.json ./apps/voice-server/
COPY packages/ ./packages/

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Prisma engines are platform-specific: the committed client was generated on
# macOS, so regenerate INSIDE the image (the schema lives in packages/db).
RUN pnpm --filter @antigravity/db exec prisma generate

COPY apps/voice-server/ ./apps/voice-server/

# Build the app AND all its workspace dependencies (llm, db, types, utils,
# errors, validators, ...) in topological order. No `|| true` — a compile
# failure must fail the image build, not ship a crash-looping container.
RUN pnpm --filter "@antigravity/voice-server..." build

CMD ["pnpm", "--filter", "@antigravity/voice-server", "start"]
