#!/usr/bin/env bash
set -a  # Auto-export all variables

PORT=3001
DATABASE_URL="postgresql://framefind:framefind@localhost:5433/framefind?schema=public"
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
LIVENESS_TOKEN_SECRET=dev-liveness-secret
SEARCH_SESSION_SECRET=dev-search-secret
APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=mock
GOOGLE_CLIENT_SECRET=mock
GOOGLE_REDIRECT_URI="http://localhost:3001/v1/auth/google/callback"
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minio
S3_SECRET_ACCESS_KEY=minio123
S3_BUCKET=framefind
STRIPE_SECRET_KEY=sk_test_mock

set +a

exec node dist/apps/api-gateway/src/main.js
