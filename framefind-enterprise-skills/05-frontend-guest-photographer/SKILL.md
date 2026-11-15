---
name: framefind-frontend-ux
description: Frontend skill for FrameFind photographer dashboard and guest QR-to-gallery flow. Use whenever the user asks for UI implementation, frontend architecture, liveness UX, upload dashboard, guest gallery, session handling, or mobile browser compatibility.
---

# FrameFind Frontend UX

## Mission
Build a low-friction photographer and guest experience that meets PRD latency and usability targets.

## Core journeys
- Photographer: auth -> create event -> upload -> indexing progress -> share QR/link
- Guest: open slug -> optional password -> liveness flow -> matched gallery -> download/zip

## UX rules
1. Keep liveness flow under 5 seconds where possible.
2. Show explicit progress and recovery on all async steps.
3. Provide actionable retry guidance for no-face/no-match cases.
4. Keep guest state ephemeral in session storage.
5. Maintain accessibility on low-end mobile devices.

## Frontend architecture checklist
- Zustand for auth/upload local state
- React Query for server state polling
- Guarded routes for photographer dashboard
- Error boundaries on upload and search pages

## Output format
### Frontend Delivery Spec
- Screen/route:
- User intent:
- State model:
- API dependencies:
- Edge cases:
- Telemetry events:
