# Antigravity / DeskBuddy Monorepo

Antigravity is an AI-powered CRM and business operating system for Indian SMBs. The CRM handles sales, customer support, and outreach end-to-end using AI.

## Project Structure

This is a monorepo structured with `pnpm workspaces`:

```
DeskBuddy/
  apps/
    api/                   ← Express + TypeScript (Core REST backend on :3000)
    web/                   ← React + Vite (Frontend Client Dashboard on :5173)
    voice-server/          ← LiveKit + Telephony Voice Agent on :3001
    post-call-server/      ← Express Post-Call Processing Worker on :3002
    website/               ← Marketing & Landing Site on :5174
  packages/
    types/                 ← Shared TypeScript interfaces
    validators/            ← Shared Zod schemas
    ui/                    ← Shared React UI components
    llm/                   ← Shared LLM client abstractions
    agent-core/            ← Shared agent engine
    observability/         ← Sentry & logging setup
    db/                    ← Prisma client & PostgreSQL database schema
    utils/                 ← Common utilities
    errors/                ← Custom error definitions
  infrastructure/          ← AWS CDK for infrastructure deployment
```

## Quick Start

For detailed end-to-end instructions, see **[SETUP.md](./SETUP.md)**.

### 1. Prerequisites
- Node.js >= 18
- pnpm >= 8 (`npm install -g pnpm`)
- Docker Desktop

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Setup Environment Variables
```bash
# Copy example env files
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/voice-server/.env
cp .env.example apps/post-call-server/.env
cp .env.example packages/db/.env
```

### 4. Start Local Postgres and Typesense
```bash
docker compose up -d postgres typesense
```

### 5. Generate Database Client & Run Migrations
```bash
pnpm db:generate
pnpm db:migrate
```

### 6. Start All Development Servers
```bash
pnpm dev
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000/api/v1`
- **Voice Server**: `http://localhost:3001`
- **Post-Call Server**: `http://localhost:3002`
- **Marketing Site**: `http://localhost:5174`
