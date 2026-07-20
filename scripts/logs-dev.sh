#!/usr/bin/env bash
# Live logs from the dev EC2 box, streamed to your terminal:
#
#   ./scripts/logs-dev.sh                 # all services, follow
#   ./scripts/logs-dev.sh voice-server    # one service, follow
#   ./scripts/logs-dev.sh api post-call-server
#
# Requires the AWS session-manager-plugin:
#   brew install --cask session-manager-plugin
set -euo pipefail

PROFILE="indiai"
REGION="ap-south-1"

if ! command -v session-manager-plugin >/dev/null 2>&1; then
  echo "Missing session-manager-plugin. Install with:" >&2
  echo "  brew install --cask session-manager-plugin" >&2
  exit 1
fi

INSTANCE_ID=$(aws ssm get-parameter --name /indiai/dev/ec2-instance-id \
  --profile "$PROFILE" --region "$REGION" --query Parameter.Value --output text)

SERVICES="$*"
exec aws ssm start-session --profile "$PROFILE" --region "$REGION" \
  --target "$INSTANCE_ID" \
  --document-name AWS-StartInteractiveCommand \
  --parameters "command=[\"cd /app/indiAi && sudo docker compose -f docker-compose.yml -f docker-compose.deploy.yml logs -f --tail 50 ${SERVICES}\"]"
