# Repo Initialization Plan

## Phase A: Backend bootstrap

1. Initialize monorepo tooling in `apis/` (pnpm workspaces or Nx).
2. Create NestJS `api-gateway` app.
3. Create NestJS `worker` app.
4. Add `shared-contracts` package.
5. Configure PostgreSQL, Redis, and env validation.

## Phase B: Frontend bootstrap

1. Create Next.js app in `web/` (App Router + TypeScript).
2. Add baseline route groups for auth, dashboard, and guest flow.
3. Add state stack: React Query + Zustand.

## Phase C: Local infrastructure

1. Add compose stack for postgres, redis, and minio (optional local S3).
2. Add migration and seed scripts.
3. Add health checks and smoke test scripts.
