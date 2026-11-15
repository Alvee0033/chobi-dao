# FrameFind Backend Map (PRD-aligned)

## 1. Runtime topology

- API Gateway (NestJS/Fastify)
- Worker (NestJS + BullMQ)
- AI Service (FastAPI + InsightFace)
- PostgreSQL + pgvector
- Redis (queue, token replay prevention, rate limits)
- Object storage (R2/S3)

## 2. API Gateway module map

- `auth`
  - signup/login/refresh/google/liveness-token
  - JWT + refresh rotation + guards
- `events`
  - CRUD, slug generation, status transitions, QR metadata
- `upload`
  - presigned upload URLs, finalize, index status, retry
- `search`
  - liveness-token validation, embedding extraction request, pgvector query
- `analytics`
  - scan metrics aggregation and CSV export

## 3. Worker responsibilities

- Consume `face-index` jobs
- Download image from object storage
- Call AI service `/analyze`
- Persist embeddings in `face_embeddings`
- Update photo status counters and retry failures

## 4. AI service responsibilities

- Expose `/analyze` for face detection + embedding extraction
- Return normalized vectors and bbox metadata
- No persistence of user-provided frames

## 5. Data ownership boundaries

- API Gateway owns: photographers/events/photos/guest_sessions/scan_events
- Worker owns: indexing execution state and retries
- AI Service owns: model lifecycle and inference configuration
- Shared contracts only in `apis/packages/shared-contracts`

## 6. Suggested folder layout inside `apis/apps/api-gateway/src`

```text
src/
  modules/
    auth/
      controllers/
      dto/
      guards/
      services/
    events/
      controllers/
      dto/
      entities/
      services/
    upload/
      controllers/
      dto/
      services/
    search/
      controllers/
      dto/
      services/
    analytics/
      controllers/
      dto/
      services/
  common/
    filters/
    interceptors/
    pipes/
  main.ts
```

## 7. Delivery order (from PRD roadmap)

1. Auth + Events
2. Upload pipeline
3. Face indexing worker
4. Guest liveness + search
5. QR/sharing + analytics
6. Billing and launch hardening
