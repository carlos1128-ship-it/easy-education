-- Supabase runtime security: user scoped RLS, private files bucket, and realtime refresh support.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_plan_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "study_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uploaded_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quizzes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quiz_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flashcard_decks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "flashcards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "essays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_user_scope') THEN
    CREATE POLICY "profiles_user_scope" ON "profiles"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_plans' AND policyname = 'study_plans_user_scope') THEN
    CREATE POLICY "study_plans_user_scope" ON "study_plans"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_sessions' AND policyname = 'study_sessions_user_scope') THEN
    CREATE POLICY "study_sessions_user_scope" ON "study_sessions"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'uploaded_files' AND policyname = 'uploaded_files_user_scope') THEN
    CREATE POLICY "uploaded_files_user_scope" ON "uploaded_files"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quizzes' AND policyname = 'quizzes_user_scope') THEN
    CREATE POLICY "quizzes_user_scope" ON "quizzes"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'flashcard_decks' AND policyname = 'flashcard_decks_user_scope') THEN
    CREATE POLICY "flashcard_decks_user_scope" ON "flashcard_decks"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'essays' AND policyname = 'essays_user_scope') THEN
    CREATE POLICY "essays_user_scope" ON "essays"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chat_messages' AND policyname = 'chat_messages_user_scope') THEN
    CREATE POLICY "chat_messages_user_scope" ON "chat_messages"
      FOR ALL TO authenticated
      USING ("user_id" = auth.uid()::text)
      WITH CHECK ("user_id" = auth.uid()::text);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'study_plan_subjects' AND policyname = 'study_plan_subjects_user_scope') THEN
    CREATE POLICY "study_plan_subjects_user_scope" ON "study_plan_subjects"
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "study_plans" sp WHERE sp."id" = "study_plan_subjects"."plan_id" AND sp."user_id" = auth.uid()::text))
      WITH CHECK (EXISTS (SELECT 1 FROM "study_plans" sp WHERE sp."id" = "study_plan_subjects"."plan_id" AND sp."user_id" = auth.uid()::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quiz_questions' AND policyname = 'quiz_questions_user_scope') THEN
    CREATE POLICY "quiz_questions_user_scope" ON "quiz_questions"
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "quizzes" q WHERE q."id" = "quiz_questions"."quiz_id" AND q."user_id" = auth.uid()::text))
      WITH CHECK (EXISTS (SELECT 1 FROM "quizzes" q WHERE q."id" = "quiz_questions"."quiz_id" AND q."user_id" = auth.uid()::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'flashcards' AND policyname = 'flashcards_user_scope') THEN
    CREATE POLICY "flashcards_user_scope" ON "flashcards"
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM "flashcard_decks" fd WHERE fd."id" = "flashcards"."deck_id" AND fd."user_id" = auth.uid()::text))
      WITH CHECK (EXISTS (SELECT 1 FROM "flashcard_decks" fd WHERE fd."id" = "flashcards"."deck_id" AND fd."user_id" = auth.uid()::text));
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arquivos',
  'arquivos',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'arquivos_user_select') THEN
    CREATE POLICY "arquivos_user_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'arquivos' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'arquivos_user_insert') THEN
    CREATE POLICY "arquivos_user_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'arquivos' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'arquivos_user_update') THEN
    CREATE POLICY "arquivos_user_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'arquivos' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text))
      WITH CHECK (bucket_id = 'arquivos' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'arquivos_user_delete') THEN
    CREATE POLICY "arquivos_user_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'arquivos' AND ((storage.foldername(name))[1] = auth.uid()::text OR (storage.foldername(name))[2] = auth.uid()::text));
  END IF;
END $$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles',
    'study_plans',
    'study_sessions',
    'uploaded_files',
    'quizzes',
    'quiz_questions',
    'flashcard_decks',
    'flashcards',
    'essays',
    'chat_messages'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
