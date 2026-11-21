ALTER TABLE "photographers" ADD COLUMN "system_role" TEXT NOT NULL DEFAULT 'photographer';
ALTER TABLE "photos" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

CREATE TYPE "photo_removal_status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TABLE "photo_removal_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "photo_id" UUID NOT NULL,
  "guest_session_id" UUID NOT NULL,
  "status" "photo_removal_status" NOT NULL DEFAULT 'pending',
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "photo_removal_requests_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "photo_removal_requests" ADD CONSTRAINT "photo_removal_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_removal_requests" ADD CONSTRAINT "photo_removal_requests_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photo_removal_requests" ADD CONSTRAINT "photo_removal_requests_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "photo_removal_requests_photo_id_guest_session_id_key" ON "photo_removal_requests"("photo_id", "guest_session_id");
CREATE INDEX "photo_removal_requests_event_id_status_created_at_idx" ON "photo_removal_requests"("event_id", "status", "created_at");

CREATE TYPE "admin_audit_action" AS ENUM ('indexing_retry', 'admin_grant', 'removal_review');
CREATE TABLE "admin_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "admin_id" UUID NOT NULL,
  "action" "admin_audit_action" NOT NULL,
  "resource_type" TEXT NOT NULL,
  "resource_id" UUID NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at" DESC);
CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at" DESC);
