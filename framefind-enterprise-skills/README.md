# FrameFind Enterprise Agent Skills

This package translates `framefind_prd.md` into enterprise-ready, role-based agent skills.

## Structure

- `00-orchestration/` Program-level orchestration and governance
- `01-product-delivery/` PRD delivery planning and phase control
- `02-platform-architecture/` System and architecture decisions
- `03-backend-api/` NestJS, PostgreSQL/pgvector, Redis, BullMQ implementation
- `04-ai-face-recognition/` InsightFace indexing, liveness, threshold tuning
- `05-frontend-guest-photographer/` React/Next UX for photographer and guest flows
- `06-qa-release/` Test strategy, performance and release readiness
- `07-security-privacy/` GDPR Article 9, auth/session, data minimization controls
- `templates/` Standard artifacts for handoff and reporting

## How to use

1. Start with `00-orchestration/SKILL.md` to align scope and milestones.
2. Trigger role-specific skills based on the active workstream.
3. Use `templates/enterprise-delivery-checklist.md` for weekly governance.
4. Gate releases through `06-qa-release` and `07-security-privacy` before production.

## Source of truth

All skills in this package are derived from:
- `framefind_prd.md` (version 1.0, updated 2026-05-14)
