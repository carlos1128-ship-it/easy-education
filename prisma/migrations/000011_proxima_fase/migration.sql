-- Próxima fase (10/10/2026). Só aditiva: tabelas novas e colunas opcionais; nada existente é apagado ou alterado.
-- 1.1 estado do bloco do plano no servidor; 1.5 origem do flashcard; 1.6 anotações; 1.7 resumo do dia;
-- 1.2 portão de qualidade das questões geradas por IA.

-- Assinatura: de qual gateway ela vem (cartão no Stripe hoje; Pix Automático depois).
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'stripe';

-- 1.5 / 1.1: origem do flashcard e data da última revisão
ALTER TABLE "flashcards" ADD COLUMN IF NOT EXISTS "last_reviewed_at" TIMESTAMP(3);
ALTER TABLE "flashcards" ADD COLUMN IF NOT EXISTS "source_kind" TEXT;
ALTER TABLE "flashcards" ADD COLUMN IF NOT EXISTS "source_quiz_question_id" TEXT;
CREATE INDEX IF NOT EXISTS "flashcards_source_quiz_question_id_idx" ON "flashcards"("source_quiz_question_id");
DO $$ BEGIN
  ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_source_quiz_question_id_fkey" FOREIGN KEY ("source_quiz_question_id") REFERENCES "quiz_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1.1: bloco do plano iniciado num dia
CREATE TABLE IF NOT EXISTS "study_block_runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "block_key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT '',
    "planned_minutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'em_andamento',
    "activity" TEXT,
    "activity_id" TEXT,
    "href" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timer_started_at" TIMESTAMP(3),
    "studied_minutes" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "study_block_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "study_block_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "study_block_runs_user_id_day_block_key_key" ON "study_block_runs"("user_id", "day", "block_key");
CREATE INDEX IF NOT EXISTS "study_block_runs_user_id_status_idx" ON "study_block_runs"("user_id", "status");

-- 1.6: anotações
CREATE TABLE IF NOT EXISTS "notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "subject" TEXT,
    "topic" TEXT,
    "block_day" TEXT,
    "block_key" TEXT,
    "quiz_id" TEXT,
    "question_id" TEXT,
    "question_kind" TEXT,
    "file_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notes_user_id_created_at_idx" ON "notes"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notes_user_id_subject_idx" ON "notes"("user_id", "subject");
CREATE INDEX IF NOT EXISTS "notes_user_id_block_day_block_key_idx" ON "notes"("user_id", "block_day", "block_key");

-- 1.7: resumo do dia
CREATE TABLE IF NOT EXISTS "day_summaries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "studied" JSONB NOT NULL,
    "feedback" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "day_summaries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "day_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "day_summaries_user_id_day_key" ON "day_summaries"("user_id", "day");

-- 1.2: confiabilidade das questões geradas por IA (só o servidor lê e grava)
CREATE TABLE IF NOT EXISTS "ai_quality_scores" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "sample" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "lower_bound" DOUBLE PRECISION NOT NULL,
    "reviewer" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_quality_scores_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_quality_scores_scope_kind_created_at_idx" ON "ai_quality_scores"("scope", "kind", "created_at");

-- RLS: cada aluno vê só os próprios blocos, anotações e resumos. O app acessa pelo servidor (Prisma),
-- mas as políticas protegem qualquer acesso direto com a chave pública do Supabase.
ALTER TABLE "study_block_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "day_summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_quality_scores" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'study_block_runs' AND policyname = 'study_block_runs_user_scope') THEN
    CREATE POLICY "study_block_runs_user_scope" ON "study_block_runs"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'notes_user_scope') THEN
    CREATE POLICY "notes_user_scope" ON "notes"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'day_summaries' AND policyname = 'day_summaries_user_scope') THEN
    CREATE POLICY "day_summaries_user_scope" ON "day_summaries"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;
END $$;
