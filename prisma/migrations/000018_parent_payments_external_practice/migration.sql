-- Aditiva: mantém tentativas antigas com a correção revisada que já utilizavam.
ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'graded';

CREATE TABLE IF NOT EXISTS "parent_payment_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "profiles"("user_id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "plan" TEXT NOT NULL CHECK ("plan" IN ('basic', 'full')),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "completed_at" TIMESTAMP(3),
  "stripe_session_id" TEXT UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "parent_payment_requests_user_id_created_at_idx" ON "parent_payment_requests"("user_id", "created_at");
ALTER TABLE "parent_payment_requests" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "parent_payment_requests" FROM anon, authenticated;
