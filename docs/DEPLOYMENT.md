# Deployment — how it works right now (2026-07-20)

## Architecture

```
Mac (build)  ──push images──▶  ECR (ap-south-1)
                                   │ pull
git push main ──────────────▶  EC2 dev box (t3.small, ap-south-1)
              (via SSM cmd)        └─ docker compose: api, voice-server,
                                      post-call-server, postgres, typesense
```

- **Account/profile:** AWS account `512438352667`, CLI profile `indiai`
- **Dev box:** instance id in SSM param `/indiai/dev/ec2-instance-id` (ap-south-1),
  Elastic IP `15.207.7.17` (permanent). API: `https://api.deskbuddy.in/api/v1/health`
  (Caddy container terminates TLS, auto Let's Encrypt; DNS at the deskbuddy.in registrar)
- **No SSH** — all access via SSM (`aws ssm start-session --target <instance-id> --profile indiai --region ap-south-1`)
- **Secrets:** `.env` on the box is written from Secrets Manager `indiai/dev/env` (ap-south-1) on every deploy. To change env vars, edit the secret, then redeploy.
- **The box never builds images.** t3.small (2 GB) can only run them. Images are built on a dev Mac and pushed to ECR (`docker-compose.deploy.yml` overrides `build:` with ECR `image:` refs).

## Daily commands (cheat sheet)

```bash
./scripts/deploy-dev.sh api            # deploy: rebuild api image + deploy to box
./scripts/deploy-dev.sh                # deploy config-only change (no rebuild)
./scripts/logs-dev.sh voice-server     # live logs in terminal (Ctrl+C to stop)
bash scripts/db-tunnel-dev.sh          # DB tunnel — then connect your Postgres app:
                                       #   localhost:5433, db indiai, user postgres,
                                       #   password = POSTGRES_PASSWORD in indiai/dev/env secret
```

Logs are also in AWS console: CloudWatch → Log groups → `/indiai/dev` (Mumbai).
The DB tunnel is per-session: run it each time, keep the terminal open while browsing.

## Deploying a code change (manual, current)

```bash
# 1. push code
git push origin main

# 2. login to ECR (once per ~12h)
aws ecr get-login-password --profile indiai --region ap-south-1 \
  | docker login --username AWS --password-stdin 512438352667.dkr.ecr.ap-south-1.amazonaws.com

# 3. rebuild ONLY the app(s) you changed (Mac is ARM, box is Intel → --platform)
docker buildx build --platform linux/amd64 -f apps/api/Dockerfile \
  -t 512438352667.dkr.ecr.ap-south-1.amazonaws.com/indiai/api:latest --push .
# same pattern for apps/voice-server and apps/post-call-server

# 4. tell the box to update (pull code + images, restart, health-check)
INSTANCE_ID=$(aws ssm get-parameter --name /indiai/dev/ec2-instance-id \
  --profile indiai --region ap-south-1 --query Parameter.Value --output text)
aws ssm send-command --profile indiai --region ap-south-1 \
  --instance-ids "$INSTANCE_ID" --document-name AWS-RunShellScript \
  --parameters 'commands=["export HOME=/root","git -C /app/indiAi pull origin main","bash /app/indiAi/scripts/deploy.sh dev"]'
```

What `scripts/deploy.sh` does on the box: fetch `.env` from Secrets Manager →
ECR login → `docker compose pull` → `up -d` → health check (fails loudly if unhealthy).

Config-only changes (compose files, deploy script, secrets) need **no image rebuild** — just push + step 4.

## Database schema changes

Production uses version-controlled Prisma migrations via `prisma migrate deploy` (`pnpm db:deploy`). After deploying a schema change:

```bash
aws ssm send-command ... --parameters 'commands=["cd /app/indiAi","docker compose -f docker-compose.yml -f docker-compose.deploy.yml exec -T api pnpm db:deploy"]'
```

## Why manual? (temporary)

The CodePipeline (`IndiAi-Deployment-Pipeline`, us-east-1) fails at Build:
new-account CodeBuild concurrency quota is 0. Increase request filed
2026-07-19, status CASE_OPENED. Once approved:

1. Update the Build buildspec (`infrastructure/stacks/pipeline/pipeline-stack.ts`)
   to build + push the Docker images (currently it only runs `cdk synth`).
2. Then `git push main` = fully automatic: build → push to ECR → SSM deploy → health check.

## Prod (not deployed yet)

Deliberately skipped. When needed: create `indiai/prod/env` secret in
ap-south-1, then `cd infrastructure && npx cdk deploy "Prod/*" --profile indiai`.
Second instance costs ~$8–24/mo depending on size.

## Cost

~$24/mo (t3.small $16 + EBS 30GB gp3 $2.7 + public IPv4 $3.7 + ECR ~$0.6),
paid from the $100 account credits. Stopping the instance overnight roughly halves it.

## Gotchas learned the hard way

- Repo is **private**: the box authenticates git via a credential helper that
  reads `indiai/github-token` (us-east-1) at pull time. Never bake tokens into files.
- zsh eats `$var:latest` (`:l` is a modifier) — always write `${var}:latest`.
- Stale `cdk.out` can contain empty asset dirs → "non-empty zip" deploy errors.
  Fix: `rm -rf infrastructure/cdk.out` and delete the matching object from the
  `cdk-hnb659fds-assets-…` bucket, then redeploy.
- `pnpm.supportedArchitectures` in root package.json must include `linux`,
  or images get macOS-only native binaries and crash on the box.
