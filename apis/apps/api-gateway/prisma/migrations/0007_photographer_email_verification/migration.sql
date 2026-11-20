ALTER TABLE "photographers"
  ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "email_verification_code_hash" TEXT,
  ADD COLUMN "email_verification_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "email_verification_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "email_verification_attempts" INTEGER NOT NULL DEFAULT 0;
