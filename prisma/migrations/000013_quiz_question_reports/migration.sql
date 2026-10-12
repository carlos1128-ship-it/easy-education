-- "Avisar erro" nas questões de quiz e simulado. Só aditiva (tabela nova); nada existente muda.
CREATE TABLE IF NOT EXISTS "quiz_question_reports" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "quiz_question_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'aberto',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_question_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quiz_question_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "quiz_question_reports_quiz_question_id_fkey" FOREIGN KEY ("quiz_question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "quiz_question_reports_status_created_at_idx" ON "quiz_question_reports"("status", "created_at");
CREATE INDEX IF NOT EXISTS "quiz_question_reports_quiz_question_id_idx" ON "quiz_question_reports"("quiz_question_id");
