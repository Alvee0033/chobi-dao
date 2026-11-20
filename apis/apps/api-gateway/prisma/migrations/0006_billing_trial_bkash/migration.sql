ALTER TABLE "photographers"
  ADD COLUMN "trial_ends_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + interval '14 days');

ALTER TABLE "subscriptions"
  ALTER COLUMN "stripe_sub_id" DROP NOT NULL,
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'bkash',
  ADD COLUMN "provider_payment_id" TEXT,
  ADD COLUMN "transaction_id" TEXT,
  ADD COLUMN "amount" DECIMAL(10,2),
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'BDT',
  ADD COLUMN "current_period_end" TIMESTAMPTZ(6);

CREATE INDEX "subscriptions_provider_payment_id_idx" ON "subscriptions"("provider_payment_id");
CREATE INDEX "scan_events_event_created_idx" ON "scan_events"("event_id", "created_at");
