-- Controle de uso por plano e registro de custo de IA. Só tabelas novas: nada existente é alterado.

CREATE TABLE IF NOT EXISTS "usage_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ai_call_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "plan" TEXT,
    "feature" TEXT,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "usage_events_user_id_feature_created_at_idx" ON "usage_events"("user_id", "feature", "created_at");
CREATE INDEX IF NOT EXISTS "usage_events_user_id_created_at_idx" ON "usage_events"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_call_logs_user_id_created_at_idx" ON "ai_call_logs"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "ai_call_logs_created_at_idx" ON "ai_call_logs"("created_at");

-- Segurança: só o servidor (Prisma, sem RLS) lê e grava. Sem política = o cliente do navegador não acessa.
ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_call_logs" ENABLE ROW LEVEL SECURITY;
