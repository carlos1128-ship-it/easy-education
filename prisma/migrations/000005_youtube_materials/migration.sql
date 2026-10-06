-- Videos do YouTube como material de estudo. Colunas novas e opcionais.
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "source_url" TEXT;
ALTER TABLE "uploaded_files" ADD COLUMN IF NOT EXISTS "processing_error" TEXT;
CREATE INDEX IF NOT EXISTS "uploaded_files_source_url_idx" ON "uploaded_files"("source_url");
