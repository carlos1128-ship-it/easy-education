-- Etapas do roteiro marcadas pelo próprio aluno (somam com os checks automáticos). Só aditiva.
ALTER TABLE "study_block_runs" ADD COLUMN IF NOT EXISTS "manual_checks" JSONB NOT NULL DEFAULT '[]';
