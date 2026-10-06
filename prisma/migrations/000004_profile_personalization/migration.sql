-- Personalizacao detalhada do aluno (onboarding). Coluna nova e opcional: nao altera dados existentes.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "personalization" JSONB;
