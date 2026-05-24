FROM node:20-alpine
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api/ ./apps/api/

# Generate Prisma client BEFORE building
RUN pnpm --filter api exec prisma generate

# Build
RUN pnpm --filter api build

EXPOSE 3000
CMD ["pnpm", "--filter", "api", "start"]
