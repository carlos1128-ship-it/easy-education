-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style_label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_subjects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_topics" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_questions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "edition" TEXT NOT NULL DEFAULT '',
    "number" INTEGER NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "area" TEXT,
    "statement" TEXT NOT NULL,
    "support_text" TEXT,
    "images" JSONB,
    "options" JSONB NOT NULL,
    "correct_label" TEXT NOT NULL,
    "subject_id" TEXT,
    "topic_id" TEXT,
    "subtopic" TEXT,
    "skill" TEXT,
    "difficulty" TEXT,
    "origin" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_url" TEXT,
    "license" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'nao_revisada',
    "explanation" TEXT,
    "explanation_status" TEXT NOT NULL DEFAULT 'pendente',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "owner_user_id" TEXT NOT NULL DEFAULT '',
    "import_batch" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "exam_id" TEXT,
    "title" TEXT NOT NULL,
    "question_ids" JSONB NOT NULL,
    "time_limit_sec" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "bank_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "session_id" TEXT,
    "selected" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "time_ms" INTEGER NOT NULL DEFAULT 0,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bookmarks" (
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bookmarks_pkey" PRIMARY KEY ("user_id","question_id")
);

-- CreateTable
CREATE TABLE "question_reviews" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "next_review" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exams_slug_key" ON "exams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "bank_subjects_slug_key" ON "bank_subjects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "bank_topics_subject_id_slug_key" ON "bank_topics"("subject_id", "slug");

-- CreateIndex
CREATE INDEX "bank_questions_exam_id_year_idx" ON "bank_questions"("exam_id", "year");

-- CreateIndex
CREATE INDEX "bank_questions_subject_id_topic_id_idx" ON "bank_questions"("subject_id", "topic_id");

-- CreateIndex
CREATE INDEX "bank_questions_is_published_origin_idx" ON "bank_questions"("is_published", "origin");

-- CreateIndex
CREATE UNIQUE INDEX "bank_questions_exam_id_year_edition_number_variant_origin_o_key" ON "bank_questions"("exam_id", "year", "edition", "number", "variant", "origin", "owner_user_id");

-- CreateIndex
CREATE INDEX "bank_sessions_user_id_started_at_idx" ON "bank_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "bank_answers_user_id_question_id_idx" ON "bank_answers"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "bank_answers_user_id_answered_at_idx" ON "bank_answers"("user_id", "answered_at");

-- CreateIndex
CREATE UNIQUE INDEX "bank_answers_session_id_question_id_key" ON "bank_answers"("session_id", "question_id");

-- CreateIndex
CREATE INDEX "question_reviews_user_id_next_review_idx" ON "question_reviews"("user_id", "next_review");

-- CreateIndex
CREATE UNIQUE INDEX "question_reviews_user_id_question_id_key" ON "question_reviews"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "question_reports_status_created_at_idx" ON "question_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "question_reports_question_id_idx" ON "question_reports"("question_id");

-- AddForeignKey
ALTER TABLE "bank_topics" ADD CONSTRAINT "bank_topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "bank_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "bank_subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "bank_topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sessions" ADD CONSTRAINT "bank_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_sessions" ADD CONSTRAINT "bank_sessions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_answers" ADD CONSTRAINT "bank_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_answers" ADD CONSTRAINT "bank_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "bank_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_answers" ADD CONSTRAINT "bank_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "bank_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bookmarks" ADD CONSTRAINT "question_bookmarks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "bank_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reviews" ADD CONSTRAINT "question_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reviews" ADD CONSTRAINT "question_reviews_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "bank_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_reports" ADD CONSTRAINT "question_reports_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "bank_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seguranca: so o servidor (Prisma, sem RLS) le e grava. Sem politicas, o cliente do navegador nao acessa.
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bank_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_bookmarks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_reports" ENABLE ROW LEVEL SECURITY;
