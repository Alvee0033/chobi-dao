# Context Rules

## Domain Routing (Do Not Mix)

- `chobidao.jantrasoft.online` must always point to the **Chobi Dao** frontend deployment (`web` project).
- `skillsync.jantrasoft.online` must always point to the **SkillSync** frontend deployment.
- Never assign both subdomains to the same deployment.

## Deployment Safety

- When deploying Chobi Dao, only deploy:
  - `web` (frontend)
  - `apis/apps/api-gateway` (backend)
- After every Chobi Dao deploy, verify aliases again because Vercel aliasing can drift.

## Mandatory Verification After Changes

Run these checks after alias/deploy updates:

1. `curl -sS https://chobidao.jantrasoft.online | rg -o '<title>[^<]+' -m 1`
2. `curl -sS https://skillsync.jantrasoft.online | rg -o '<title>[^<]+' -m 1`
3. `curl -sSI https://api-gateway-teal-five.vercel.app/v1/health`

Expected:

- Chobi title: `Chobi dao`
- SkillSync title: `SkillSync - AI-Powered Job Portal`
- API health: `HTTP 200`

## API Base URL Rule (Chobi Dao)

- Chobi frontend env must use:
  - `NEXT_PUBLIC_API_BASE_URL=https://api-gateway-teal-five.vercel.app`
- Do not include extra path segments like `/api/v1`, or login will break with duplicated paths such as `/api/v1/v1/auth/login`.

## OAuth Redirect Rule (Chobi Dao)

- Google OAuth redirect URI for Chobi Dao backend:
  - `https://api-gateway-teal-five.vercel.app/v1/auth/google/callback`

