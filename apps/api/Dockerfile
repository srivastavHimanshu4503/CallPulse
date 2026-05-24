# Base node image for monorepo context
FROM node:20-alpine AS base

# Install global pnpm
RUN npm install -g pnpm@9.0.0

WORKDIR /app

# Copy root and workspaces package definitions
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code of all components
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Build packages and api backend
RUN pnpm --filter @antigravity/types build
RUN pnpm --filter @antigravity/validators build
RUN pnpm --filter @antigravity/ui build
RUN pnpm --filter @antigravity/api build

EXPOSE 3000

WORKDIR /app/apps/api
CMD ["pnpm", "start"]
