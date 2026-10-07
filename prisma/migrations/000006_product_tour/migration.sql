-- Tutorial guiado: marca quando o aluno terminou ou pulou. Coluna nova e opcional.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "tour_completed_at" TIMESTAMP(3);
