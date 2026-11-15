# APIs Workspace

All backend services for FrameFind live here.

## Service boundaries

- `apps/api-gateway`: Auth, events, upload, search, analytics HTTP APIs
- `apps/worker`: Face indexing jobs, retries, queue consumers
- `apps/ai-service`: InsightFace model inference over HTTP
- `packages/shared-contracts`: Cross-service contracts (DTO/types/constants)

## Principles

- Module-owned DTOs/entities inside each NestJS app
- Shared contracts only across service boundaries
- Event-scoped face matching and strict authz controls
