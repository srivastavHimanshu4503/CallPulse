# Antigravity CRM

Antigravity is an AI-powered CRM and business operating system for Indian SMBs. The CRM handles sales, customer support, and outreach end-to-end using AI.

## Project Structure

This is a monorepo structured with `pnpm workspaces`:

```
antigravity/
  apps/
    api/                   ← Express + TypeScript (Node.js backend)
    web/                   ← React + Vite (frontend)
  packages/
    types/                 ← Shared TypeScript interfaces
    validators/            ← Shared Zod schemas
    ui/                    ← Shared React UI components
    config/                ← Shared eslint, tsconfig, tailwind configurations
  infrastructure/          ← AWS CDK for infrastructure deployment
```

## Quick Start

### 1. Prerequisites
- Node.js >= 18
- pnpm >= 8
- Docker Desktop

### 2. Install dependencies
From the monorepo root, run:
```bash
pnpm install
```

### 3. Spin up Local Postgres and Typesense
Make sure Docker is running, then start the database and search engine:
```bash
pnpm docker:up
```

### 4. Setup Database and Run Schema Migrations
```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start Development Servers
Run both backend and frontend applications in development mode:
```bash
pnpm dev
```
- API: `http://localhost:4000/api/v1`
- Frontend Client: `http://localhost:5173`
