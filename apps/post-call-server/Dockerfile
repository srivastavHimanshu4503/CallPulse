FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/post-call-server/package.json ./apps/post-call-server/
COPY packages/ ./packages/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build shared packages
RUN pnpm --filter @antigravity/types build || true
RUN pnpm --filter @antigravity/validators build || true
RUN pnpm --filter @antigravity/config build || true
RUN pnpm --filter @antigravity/db build || true

# Copy post-call-server source
COPY apps/post-call-server/ ./apps/post-call-server/

# Generate Prisma client for shared DB access
RUN pnpm --filter post-call-server exec prisma generate || true

# Build post-call-server
RUN pnpm --filter post-call-server build

# Run
CMD ["pnpm", "--filter", "post-call-server", "start"]
