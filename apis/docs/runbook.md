# FrameFind Backend Runbook

## Requeue failed face indexing jobs
- Use BullMQ UI or script to re-add `index-photo` with `jobId=photoId`.

## Rotate secrets
- Rotate JWT/liveness/search secrets in environment and restart API.

## Rebuild vector indexes
- Run maintenance SQL against `face_embeddings` ivfflat indexes.
