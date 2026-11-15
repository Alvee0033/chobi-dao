# Enterprise Instructions for Using FrameFind Agent Skills

## Objective
Use this package to execute FrameFind PRD delivery with role separation, governance, and release control.

## Operating model
1. Intake every request through `framefind-orchestration`.
2. Route to one primary specialized skill for implementation.
3. If cross-functional, run sequentially in this order:
   - `framefind-product-delivery`
   - `framefind-platform-architecture`
   - `framefind-backend-api` and/or `framefind-frontend-ux`
   - `framefind-ai-face-recognition`
   - `framefind-qa-release`
   - `framefind-security-privacy`
4. Close with a consolidated release recommendation.

## Enterprise standards
- Every output must cite relevant PRD section references.
- Every change must include owner, due date, and acceptance criteria.
- All production decisions must include rollback notes.
- No deployment without QA + Security sign-off.

## Artifact policy
For each major change, produce:
- Delivery Snapshot
- Change Plan/Spec
- Test evidence summary
- Security review note
- Go/No-go decision

## Escalation policy
Escalate immediately when any of the below is true:
- Search p95 exceeds 4 seconds
- False positive rate reaches or exceeds 1%
- Biometric retention behavior is ambiguous
- Open question from PRD Section 20 blocks delivery

## Change control
- Keep these skills versioned with project commits.
- Update skill instructions whenever PRD version changes.
- Re-run release checklist after each material architecture change.
