FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter @antigravity/types build || true
RUN pnpm --filter @antigravity/validators build || true
RUN pnpm --filter @antigravity/config build || true

# Copy API source
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN pnpm --filter api exec prisma generate

# Build API
RUN pnpm --filter api build

EXPOSE 3000
CMD ["pnpm", "--filter", "api", "start"]
