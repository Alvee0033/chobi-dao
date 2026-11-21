CREATE TABLE "cover_uploads" (
  "id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "photographer_id" UUID NOT NULL,
  "file_name" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "resolved_key" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "cover_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cover_uploads_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "cover_uploads_photographer_id_expires_at_idx" ON "cover_uploads"("photographer_id", "expires_at");
