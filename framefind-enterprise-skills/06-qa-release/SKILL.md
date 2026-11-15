---
name: framefind-qa-release
description: QA and release skill for FrameFind. Use whenever the user asks for test strategy, regression planning, performance validation, release readiness, UAT, defect triage, or go-live criteria.
---

# FrameFind QA & Release

## Mission
Validate functional, performance, and resilience quality before each release.

## Required test layers
- Unit: business logic and guards
- Integration: API + DB + Redis behaviors
- E2E: photographer and guest critical paths
- Performance: upload/index/search under load
- Reliability: worker retries, partial failures

## Release gates
1. Critical path pass rate = 100%
2. Search latency p50/p95 within PRD targets
3. False positive rate under threshold
4. Security/privacy checks signed off
5. Rollback and runbook validated

## Defect triage priority
- P0: auth bypass, cross-event data leak, broken search
- P1: upload/index failures at normal load
- P2: UX regressions with workaround

## Output format
### Release Readiness Report
- Version/build:
- Scope tested:
- Results summary:
- Known issues:
- Go/no-go decision:
- Rollback notes:
