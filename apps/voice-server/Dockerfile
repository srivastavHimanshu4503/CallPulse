FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma and any native dependencies for onnxruntime
RUN apt-get update -y && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/voice-server/package.json ./apps/voice-server/
COPY packages/ ./packages/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @antigravity/types build || true
RUN pnpm --filter @antigravity/validators build || true
RUN pnpm --filter @antigravity/config build || true
RUN pnpm --filter @antigravity/db build || true

# Copy voice-server source
COPY apps/voice-server/ ./apps/voice-server/

# Generate Prisma client for shared DB access
RUN pnpm --filter voice-server exec prisma generate || true

# Build voice-server
RUN pnpm --filter voice-server build

# Run
CMD ["pnpm", "--filter", "voice-server", "start"]
