---
name: framefind-backend-api
description: Backend implementation skill for FrameFind using NestJS, PostgreSQL/pgvector, Redis, and BullMQ. Use whenever the user requests API design, module implementation, upload/index/search flows, DB schema changes, worker behavior, or backend performance tuning.
---

# FrameFind Backend/API

## Mission
Implement stable, secure, and observable backend flows for auth, events, upload, indexing, search, and analytics.

## Required modules
- `auth` (JWT, refresh rotation, Google OAuth)
- `events` (CRUD, slug, status transitions)
- `upload` (presigned URLs, finalize batch)
- `search` (liveness validation, vector query)
- `analytics` (scan outcomes and rates)
- `worker` (face indexing and retries)

## Critical implementation rules
1. Enforce ownership checks on all photographer routes.
2. Use parameterized SQL for all custom queries.
3. Scope all vector search by `event_id`.
4. Enforce file type by magic bytes, not extension.
5. Keep tokens short-lived and single-use where defined.

## API quality gates
- Contract matches Section 14 endpoints
- Error shape standardized
- Rate limits enforced on guest search
- Structured logs include correlation id, event id, photo id

## Output format
### Backend Change Plan
- Endpoint/module:
- Contract change:
- Data migration:
- Failure modes:
- Tests required:
