#!/usr/bin/env bash
# Runs ON the EC2 box (as root via SSM). Images are prebuilt and pulled from
# ECR — the instance is too small to build them locally.
set -euo pipefail

ENV="${1:?usage: deploy.sh <dev|prod>}"
REGION="ap-south-1"
APP_DIR="/app/indiAi"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.deploy.yml"

cd "$APP_DIR"

aws secretsmanager get-secret-value \
  --secret-id "indiai/${ENV}/env" \
  --region "$REGION" \
  --query SecretString --output text > .env

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region "$REGION" |
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

$COMPOSE pull

# Sync Prisma schema to the DB BEFORE booting the new api image.
# Uses `prisma migrate deploy` as the production source of truth so every deploy
# applies version-controlled migrations deterministically without schema drift.
$COMPOSE run --rm --entrypoint sh api -c \
  "pnpm --filter @antigravity/db db:deploy"

$COMPOSE up -d --remove-orphans
# Caddyfile is a single-file bind mount: git pull replaces the inode and the
# running container keeps the stale one, so config edits silently no-op.
# Recreating is cheap (~2s) and deterministic.
$COMPOSE up -d --force-recreate caddy
docker image prune -f

sleep 15
curl -sf http://localhost:3000/api/v1/health && echo "Health-check-passed" || {
  echo "Health-check-failed"
  $COMPOSE logs --tail 50
  exit 1
}
