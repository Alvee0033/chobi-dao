---
name: framefind-orchestration
description: Enterprise orchestration skill for FrameFind delivery. Use this whenever the user asks to plan, coordinate, sequence, govern, or track FrameFind workstreams across product, architecture, backend, frontend, AI, QA, and security. Trigger even if the user asks only for "next steps", "project plan", "delivery status", or "roadmap execution".
---

# FrameFind Orchestration

## Mission
Drive end-to-end delivery of FrameFind from PRD to production using clear workstream ownership, release gates, and measurable outcomes.

## Mandatory inputs
- PRD: `framefind_prd.md`
- Current sprint status
- Open risks and dependencies

## Workflow
1. Map request to PRD section(s).
2. Assign one primary workstream owner:
   - Product delivery
   - Platform architecture
   - Backend/API
   - AI/face recognition
   - Frontend UX
   - QA/release
   - Security/privacy
3. Define output artifact and deadline.
4. Apply release gates in this order:
   - Functional completeness
   - Performance thresholds
   - Security/privacy controls
   - Rollback readiness
5. Publish a short decision log with owner, date, and rationale.

## Required governance checks
- PRD scope compliance (v1 in-scope only)
- Phase alignment (Weeks 1-6 roadmap)
- NFR alignment:
  - Search p50 < 1.5s
  - Search p95 < 4s
  - False positives < 1%
- GDPR biometric handling constraints are respected

## Output format
Use this exact structure:

### Delivery Snapshot
- Objective:
- Current phase:
- Owner:
- Due date:

### Work Breakdown
- Task:
- PRD reference:
- Dependency:
- Acceptance criteria:

### Risks and Decisions
- Risk:
- Impact:
- Mitigation:
- Decision log:
