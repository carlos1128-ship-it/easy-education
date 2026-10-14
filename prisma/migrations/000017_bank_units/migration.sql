-- Árvore de conteúdo do banco: matéria → unidade → tópico. Só aditiva: tabela nova e duas colunas opcionais.
CREATE TABLE IF NOT EXISTS "bank_units" (
  "id" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bank_units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_units_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "bank_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "bank_units_subject_id_slug_key" ON "bank_units"("subject_id", "slug");
ALTER TABLE "bank_units" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "bank_topics" ADD COLUMN IF NOT EXISTS "unit_id" TEXT;
ALTER TABLE "bank_topics" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE "bank_topics" ADD CONSTRAINT "bank_topics_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "bank_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "bank_topics_unit_id_idx" ON "bank_topics"("unit_id");
