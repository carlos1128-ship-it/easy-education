-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "exam_institutions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "archive_url" TEXT,
    "source_notes" TEXT,

    CONSTRAINT "exam_institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "past_exams" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "edition" TEXT NOT NULL,
    "booklet" TEXT NOT NULL,
    "day" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT '',
    "question_count" INTEGER NOT NULL,
    "first_number" INTEGER NOT NULL DEFAULT 1,
    "duration_minutes" INTEGER NOT NULL DEFAULT 300,
    "allow_pause" BOOLEAN NOT NULL DEFAULT true,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 0,
    "published_key_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "past_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_licenses" (
    "id" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_documents" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "rights_status" TEXT NOT NULL DEFAULT 'pending',
    "commercial_use_allowed" BOOLEAN NOT NULL DEFAULT false,
    "reproduction_allowed" BOOLEAN NOT NULL DEFAULT false,
    "derivatives_allowed" BOOLEAN NOT NULL DEFAULT false,
    "license_document" TEXT,
    "attribution_required" TEXT,
    "verified_at" TIMESTAMP(3),
    "license_id" TEXT,
    "storage_path" TEXT,
    "page_count" INTEGER,

    CONSTRAINT "exam_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_items" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "regions" JSONB NOT NULL,
    "source_url" TEXT NOT NULL,

    CONSTRAINT "exam_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_answer_keys" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "snapshot" JSONB NOT NULL,
    "source_url" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_answer_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "key_id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 0,
    "elapsed_seconds" INTEGER NOT NULL DEFAULT 0,
    "active_since" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "result" JSONB,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_student_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_institutions_slug_key" ON "exam_institutions"("slug");

-- CreateIndex
CREATE INDEX "past_exams_institution_id_year_idx" ON "past_exams"("institution_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "exam_documents_exam_id_kind_key" ON "exam_documents"("exam_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "exam_items_exam_id_number_key" ON "exam_items"("exam_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "exam_answer_keys_exam_id_revision_key" ON "exam_answer_keys"("exam_id", "revision");

-- CreateIndex
CREATE INDEX "exam_attempts_user_id_started_at_idx" ON "exam_attempts"("user_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_user_id_request_id_key" ON "exam_attempts"("user_id", "request_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_student_answers_attempt_id_number_key" ON "exam_student_answers"("attempt_id", "number");

-- AddForeignKey
ALTER TABLE "past_exams" ADD CONSTRAINT "past_exams_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "exam_institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_documents" ADD CONSTRAINT "exam_documents_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "past_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_documents" ADD CONSTRAINT "exam_documents_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "exam_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_items" ADD CONSTRAINT "exam_items_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "past_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_answer_keys" ADD CONSTRAINT "exam_answer_keys_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "past_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "past_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "exam_answer_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_student_answers" ADD CONSTRAINT "exam_student_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only authenticated server routes may read keys, licenses or student work.
ALTER TABLE "exam_institutions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "past_exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_licenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_answer_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exam_student_answers" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "exam_institutions", "past_exams", "exam_licenses", "exam_documents", "exam_items", "exam_answer_keys", "exam_attempts", "exam_student_answers" FROM anon, authenticated;

