CREATE TABLE "liveness_challenges" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "ip_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  CONSTRAINT "liveness_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "liveness_challenges_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "liveness_challenges_ip_hash_created_at_idx" ON "liveness_challenges"("ip_hash", "created_at");
CREATE INDEX "liveness_challenges_expires_at_idx" ON "liveness_challenges"("expires_at");
