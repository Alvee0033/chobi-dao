# FrameFind API Gateway

NestJS + Fastify API implementing v1 endpoints under `/v1`.

## Quick start

1. Copy `.env.example` to `.env`
2. From `apis/`, run `pnpm install`
3. Start infra: `pnpm compose:up`
4. Run migrations: `pnpm --filter api-gateway prisma:migrate`
5. Start API: `pnpm --filter api-gateway dev`

## Docs
- Swagger: `http://localhost:3001/docs`
- Health: `GET /v1/health`
