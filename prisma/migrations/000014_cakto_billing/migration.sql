-- Additive Cakto payment support. Existing Stripe identifiers and subscriptions remain intact.
ALTER TABLE "subscriptions" ALTER COLUMN "stripe_customer_id" DROP NOT NULL;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cakto_customer_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cakto_subscription_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cakto_order_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_cakto_customer_id_key" ON "subscriptions"("cakto_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_cakto_subscription_id_key" ON "subscriptions"("cakto_subscription_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_cakto_order_id_key" ON "subscriptions"("cakto_order_id");

CREATE TABLE IF NOT EXISTS "cakto_checkout_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cakto_checkout_attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cakto_checkout_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "cakto_checkout_attempts_order_id_key" ON "cakto_checkout_attempts"("order_id");
CREATE INDEX IF NOT EXISTS "cakto_checkout_attempts_user_id_created_at_idx" ON "cakto_checkout_attempts"("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "cakto_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cakto_events_pkey" PRIMARY KEY ("id")
);

-- Checkout tokens and event deduplication are writable only by the server.
ALTER TABLE "cakto_checkout_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cakto_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "cakto_checkout_attempts" FROM anon, authenticated;
REVOKE ALL ON "cakto_events" FROM anon, authenticated;
