ALTER TABLE "photos" ADD COLUMN "upload_expires_at" TIMESTAMPTZ(6);
CREATE INDEX "photos_upload_reservation_idx" ON "photos"("upload_expires_at") WHERE "upload_expires_at" IS NOT NULL;
