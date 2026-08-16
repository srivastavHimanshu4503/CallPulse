# DeskBuddy / Antigravity - Complete Developer Setup Guide

This guide walks through setting up the entire development environment from scratch on **Windows, macOS, or Linux**.

---

## 🛠️ 1. Prerequisites

Make sure the following tools are installed on your machine:

1. **Node.js**: `v18.0.0` or higher (Recommended: `v20` or `v22 LTS`)
   - Download from: [https://nodejs.org](https://nodejs.org)
2. **pnpm**: `v8.0.0` or higher (Recommended: `v10` or `v11`)
   - Install via npm:
     ```bash
     npm install -g pnpm
     ```
3. **Docker Desktop**:
   - Download from: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Ensure Docker Desktop is started and running.
4. **Git**:
   - Installed and configured.

---

## 🚀 2. Step-by-Step Setup

### Step 2.1: Clone the Repository
```bash
git clone <repo_url> DeskBuddy
cd DeskBuddy
```

### Step 2.2: Install Dependencies
Run the following from the root directory:
```bash
pnpm install
```
*(If prompted by pnpm v11 regarding dependency build scripts, run `pnpm approve-builds --all`)*

### Step 2.3: Set Up Environment Variables
Create your local `.env` file from the example template:
```bash
# On Windows PowerShell:
Copy-Item .env.example .env
Copy-Item .env.example apps/api/.env
Copy-Item .env.example apps/voice-server/.env
Copy-Item .env.example apps/post-call-server/.env
Copy-Item .env.example packages/db/.env

# On macOS / Linux:
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/voice-server/.env
cp .env.example apps/post-call-server/.env
cp .env.example packages/db/.env
```

Create frontend env files:
- **`apps/web/.env.local`**:
  ```env
  VITE_API_URL=http://localhost:3000
  ```
- **`apps/website/.env.local`**:
  ```env
  HOST=http://localhost:5173
  ```

> 💡 **Note**: In `.env`, default placeholder keys are provided. Replace API keys (e.g., `OPENAI_API_KEY`, `LIVEKIT_URL`, `TWILIO_*`, `RAZORPAY_*`) with team credentials if you are testing voice, payment, or telephony features.

### Step 2.4: Start PostgreSQL & Typesense (Docker)
Ensure Docker Desktop is running, then execute:
```bash
docker compose up -d postgres typesense
```
To verify containers are running:
```bash
docker compose ps
```

### Step 2.5: Generate Prisma Client & Apply Migrations
Generate the Prisma types and apply the database schema migrations to PostgreSQL:
```bash
pnpm db:generate
pnpm db:migrate
```

---

## 💻 3. Running the Development Servers

### Run Everything Together
To start all 5 applications concurrently:
```bash
pnpm dev
```

### Available Endpoints:
- 🌐 **Web App (Frontend Dashboard)**: [http://localhost:5173](http://localhost:5173)
- 🔌 **Core REST API Backend**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- 🎙️ **Voice Server (LiveKit Agent)**: `http://localhost:3001`
- 🤖 **Post-Call Processing Worker**: `http://localhost:3002`
- 📄 **Marketing / Landing Website**: [http://localhost:5174](http://localhost:5174)

---

## 🔍 4. Useful Helper Commands

- **Open Database GUI (Prisma Studio)**:
  ```bash
  pnpm db:studio
  ```
- **Run Type Checks & Full Build**:
  ```bash
  pnpm build
  ```
- **Run Linters**:
  ```bash
  pnpm lint
  ```
- **Stop Background Docker Containers**:
  ```bash
  docker compose down
  ```

---

## ❓ 5. Common Troubleshooting for Junior Engineers

1. **`pnpm: command not found`**:
   - Run `npm install -g pnpm` and restart your terminal.

2. **`Can't reach database server at localhost:5432`**:
   - Make sure Docker Desktop is running, and run `docker compose up -d postgres typesense`.

3. **`ERR_PNPM_IGNORED_BUILDS`**:
   - Run `pnpm approve-builds --all` followed by `pnpm install`.

4. **Port 3000 / 5173 / 5432 already in use**:
   - On Windows: Check with `netstat -ano | findstr :3000` and terminate the conflicting process in Task Manager.
   - On Mac/Linux: `lsof -i :3000` and `kill -9 <PID>`.
