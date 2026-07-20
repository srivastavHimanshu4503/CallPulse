#!/usr/bin/env bash
# Tunnel to the dev Postgres on the EC2 box. Keep this running, then connect
# any local client (psql, TablePlus, pgAdmin, Prisma Studio) to:
#
#   host: localhost   port: 5433   db: indiai   user: postgres
#   password: POSTGRES_PASSWORD from the indiai/dev/env secret, i.e.:
#     aws secretsmanager get-secret-value --secret-id indiai/dev/env \
#       --profile indiai --region ap-south-1 --query SecretString --output text \
#       | grep POSTGRES_PASSWORD
#
# Ctrl+C to close the tunnel.
set -euo pipefail

PROFILE="indiai"
REGION="ap-south-1"
LOCAL_PORT="${1:-5433}"

INSTANCE_ID=$(aws ssm get-parameter --name /indiai/dev/ec2-instance-id \
  --profile "$PROFILE" --region "$REGION" --query Parameter.Value --output text)

echo "Tunnel: localhost:${LOCAL_PORT} → dev postgres (instance ${INSTANCE_ID})"
exec aws ssm start-session --profile "$PROFILE" --region "$REGION" \
  --target "$INSTANCE_ID" \
  --document-name AWS-StartPortForwardingSession \
  --parameters "{\"portNumber\":[\"5432\"],\"localPortNumber\":[\"${LOCAL_PORT}\"]}"
