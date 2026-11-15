# Chobi Dao - Turn-Key Coolify & Local Deployment Guide

Chobi Dao is now completely self-hosted with **zero external cloud APIs**:
- **Face Matching**: High-performance InsightFace (`buffalo_s` ArcFace 512-d embeddings) running locally on CPU/ONNX with PostgreSQL `pgvector` HNSW cosine indexing.
- **Object / Photo Storage**: High-speed local S3-compatible MinIO bucket with automatic Sharp WebP thumbnail compression (640px inside) and disk fallback.
- **Authentication**: Local email and password credentials with JWT access/refresh tokens.
- **Photographer Portal & Attendee Search**: Full event lifecycle, photo uploads, and visitor face search.

---

## 1. Deploying to Coolify ("fahad coolify")

### Step 1: Add a New Resource in Coolify
1. In your Coolify dashboard, select your **Project** and **Environment**.
2. Click **+ New Resource** -> **Docker Compose**.
3. Choose **Private Repository** (or Git source with this repo) or select **Docker Compose Empty**.

### Step 2: Configure Docker Compose
Paste the root [docker-compose.yml](file:///home/alvee/Desktop/Media_and_Design/chobi%20dao%5D/docker-compose.yml) into the compose editor.

### Step 3: Environment Variables
Configure the following in the Coolify **Environment Variables** tab:

```env
# Public Domains
APP_BASE_URL=https://chobi.yourdomain.com
API_BASE_URL=https://api-chobi.yourdomain.com
NEXT_PUBLIC_API_URL=https://api-chobi.yourdomain.com
S3_PUBLIC_ENDPOINT=https://s3-chobi.yourdomain.com

# Database & Storage
POSTGRES_USER=chobi
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=chobi_db
MINIO_ROOT_USER=chobiadmin
MINIO_ROOT_PASSWORD=your_secure_minio_password
S3_BUCKET=chobi-photos

# Secrets
JWT_ACCESS_SECRET=your_long_random_jwt_access_secret
JWT_REFRESH_SECRET=your_long_random_jwt_refresh_secret
LIVENESS_TOKEN_SECRET=your_long_random_liveness_secret
SEARCH_SESSION_SECRET=your_long_random_search_session_secret
```

### Step 4: Routing / FQDN Setup in Coolify
In Coolify service settings, map the domains to the respective service ports:
- **`web`**: Set FQDN `https://chobi.yourdomain.com` (routes to port 3000)
- **`api-gateway`**: Set FQDN `https://api-chobi.yourdomain.com` (routes to port 3001)
- **`minio`** *(Optional public asset CDN)*: Set FQDN `https://s3-chobi.yourdomain.com` (routes to port 9000)

### Step 5: Click Deploy
Coolify will build and start all 6 services:
1. `chobi-postgres` (pgvector initialized)
2. `chobi-redis`
3. `chobi-minio` & `chobi-minio-init` (creates `chobi-photos` bucket automatically)
4. `chobi-ai-service` (InsightFace ArcFace 512-d ONNX)
5. `chobi-api-gateway` (runs `prisma migrate deploy` automatically on boot)
6. `chobi-worker`
7. `chobi-web` (Next.js standalone production build)

---

## 2. Local Testing & Running via Docker Compose

To run the entire stack locally with a single command:

```bash
docker compose up -d --build
```

### Service Endpoints
- **Web App**: `http://localhost:3000`
- **API Gateway**: `http://localhost:3001`
- **MinIO Console**: `http://localhost:9001` (user: `chobiadmin`, password: `chobiadminsecret123`)
- **AI Face Service**: `http://localhost:8000`

---

## 3. Database & pgvector Index Verification

The gateway applies migrations automatically. To verify the super-fast HNSW index in PostgreSQL:

```bash
docker exec -it chobi-postgres psql -U chobi -d chobi_db -c "\d face_embeddings"
```

Look for:
`face_embeddings_cosine_hnsw_idx USING hnsw (embedding vector_cosine_ops)`

Sub-millisecond cosine vector searches:
```sql
SELECT photo_id, 1 - (embedding <=> $1::vector) AS similarity
FROM face_embeddings
WHERE event_id = $2::uuid AND (1 - (embedding <=> $1::vector)) >= 0.50
ORDER BY similarity DESC
LIMIT 100;
```
