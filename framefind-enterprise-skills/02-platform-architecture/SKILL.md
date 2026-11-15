---
name: framefind-platform-architecture
description: Architecture skill for FrameFind system decisions. Use whenever the user asks about stack choices, service boundaries, scaling, deployment topology, data flow, resilience, or architecture tradeoffs for FrameFind.
---

# FrameFind Platform Architecture

## Mission
Design and validate architecture decisions against PRD scale, latency, and privacy targets.

## Required architecture baseline
- Frontend: Next.js + React + Tailwind
- API: NestJS (Fastify)
- Worker: BullMQ processor service
- AI service: Python FastAPI InsightFace
- Data: PostgreSQL + pgvector
- Cache/session/rate limit: Redis
- Storage/CDN: S3 or Cloudflare R2 + signed URLs

## Decision workflow
1. State problem and PRD constraint.
2. Offer at least two options.
3. Evaluate against latency, cost, operability, privacy.
4. Select option and define rollback path.
5. Record ADR summary.

## Non-negotiables
- Event-scoped face matching only
- No persistence of guest liveness frame/query embedding
- Signed URLs only for media access
- Queue retries and idempotent indexing

## Output format
### ADR Summary
- Context:
- Decision:
- Alternatives considered:
- Tradeoffs:
- Operational impact:
- Rollback plan:
