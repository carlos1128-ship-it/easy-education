CREATE TABLE IF NOT EXISTS "cakto_webhook_deliveries" (
  "id" TEXT PRIMARY KEY,
  "event" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "callback" TEXT,
  "subscription_id" TEXT,
  "order_id" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "processed_at" TIMESTAMP(3),
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "cakto_webhook_deliveries_processed_at_next_attempt_at_idx" ON "cakto_webhook_deliveries"("processed_at", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "cakto_webhook_deliveries_callback_idx" ON "cakto_webhook_deliveries"("callback");
ALTER TABLE "cakto_webhook_deliveries" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "cakto_webhook_deliveries" FROM anon, authenticated;
