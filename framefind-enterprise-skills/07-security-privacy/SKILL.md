---
name: framefind-security-privacy
description: Security and privacy skill for FrameFind biometric workflows. Use whenever the user asks about GDPR, biometric handling, auth/session hardening, data retention, threat mitigation, abuse prevention, or security sign-off.
---

# FrameFind Security & Privacy

## Mission
Enforce secure-by-default implementation for biometric search workflows and photographer data.

## Core controls
- Biometric minimization: no stored guest query frame/embedding
- Event-bound matching only
- Signed URL-only object access
- JWT + refresh rotation + single-use liveness tokens
- Rate limiting and lockout protections

## Review workflow
1. Map feature to data classification.
2. Validate legal/privacy constraints (GDPR Article 9 context).
3. Validate authz, token lifecycle, and storage access.
4. Validate logging excludes sensitive payloads.
5. Produce remediation plan with owner and due date.

## Mandatory checks
- Token TTLs and one-time use semantics
- Cascading delete behavior for biometric data
- Password hashing and cookie security flags
- OWASP Top 10 controls in affected code paths

## Output format
### Security Review Note
- Feature:
- Data involved:
- Threats identified:
- Controls present:
- Gaps:
- Required remediation:
