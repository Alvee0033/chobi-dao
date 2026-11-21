CREATE TABLE "admin_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "must_change_password" BOOLEAN NOT NULL DEFAULT true,
  "token_version" INTEGER NOT NULL DEFAULT 0,
  "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(6),
  "disabled_at" TIMESTAMPTZ(6),
  "last_login_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "admin_accounts_email_key" ON "admin_accounts"("email");
