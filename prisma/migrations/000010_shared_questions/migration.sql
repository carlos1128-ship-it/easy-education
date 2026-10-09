-- Questões geradas por IA e conferidas, reaproveitadas entre alunos (mesmo assunto e estilo de prova).
-- Só tabelas novas: nada existente é alterado. RLS ligado sem políticas: só o servidor (Prisma) acessa.

CREATE TABLE IF NOT EXISTS "shared_questions" (
    "id" TEXT NOT NULL,
    "subject_key" TEXT NOT NULL,
    "style_key" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "source_user_id" TEXT,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shared_question_uses" (
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shared_question_uses_pkey" PRIMARY KEY ("user_id", "question_id"),
    CONSTRAINT "shared_question_uses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "shared_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "shared_questions_subject_key_style_key_difficulty_idx" ON "shared_questions"("subject_key", "style_key", "difficulty");
CREATE INDEX IF NOT EXISTS "shared_question_uses_question_id_idx" ON "shared_question_uses"("question_id");

ALTER TABLE "shared_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shared_question_uses" ENABLE ROW LEVEL SECURITY;
