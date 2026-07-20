#!/usr/bin/env bash
# One-command dev deploy, run from your Mac:
#
#   ./scripts/deploy-dev.sh                # deploy current main (no image rebuild)
#   ./scripts/deploy-dev.sh api            # rebuild api image, then deploy
#   ./scripts/deploy-dev.sh api voice-server post-call-server
#
# Rebuild an app's image whenever you changed its code (or packages/* it uses).
# Frontend (apps/web) deploys itself via Vercel on git push — not handled here.
set -euo pipefail

PROFILE="indiai"
REGION="ap-south-1"
ECR="512438352667.dkr.ecr.${REGION}.amazonaws.com"
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: uncommitted changes — commit and push first (the box pulls main)." >&2
  exit 1
fi
git push origin main

if [ "$#" -gt 0 ]; then
  aws ecr get-login-password --profile "$PROFILE" --region "$REGION" |
    docker login --username AWS --password-stdin "$ECR"
  for app in "$@"; do
    echo "=== building $app (linux/amd64) ==="
    docker buildx build --platform linux/amd64 \
      -f "apps/${app}/Dockerfile" \
      -t "${ECR}/indiai/${app}:latest" --push .
  done
fi

INSTANCE_ID=$(aws ssm get-parameter --name /indiai/dev/ec2-instance-id \
  --profile "$PROFILE" --region "$REGION" --query Parameter.Value --output text)

echo "=== deploying to $INSTANCE_ID ==="
CMD_ID=$(aws ssm send-command --profile "$PROFILE" --region "$REGION" \
  --instance-ids "$INSTANCE_ID" --document-name AWS-RunShellScript \
  --timeout-seconds 600 \
  --parameters 'commands=["export HOME=/root","git -C /app/indiAi pull origin main","bash /app/indiAi/scripts/deploy.sh dev"]' \
  --query Command.CommandId --output text)

while [ "$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --profile "$PROFILE" --region "$REGION" --query Status --output text)" = "InProgress" ]; do
  sleep 10
done

aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$INSTANCE_ID" \
  --profile "$PROFILE" --region "$REGION" \
  --query '{status:Status,output:StandardOutputContent}' --output text | tail -5
