FROM node:20-alpine
WORKDIR /app

# Copy all workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build shared packages FIRST
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
