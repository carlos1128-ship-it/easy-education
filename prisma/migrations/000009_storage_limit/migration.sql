-- Limite de tamanho do bucket "arquivos" de 20 MB para 50 MB (o plano Completo aceita arquivos de ate 50 MB; o limite por plano e conferido no servidor).
-- Ja aplicado no banco; este arquivo registra a mudanca. So relaxa o limite, nao altera dados.
UPDATE storage.buckets SET file_size_limit = 52428800 WHERE id = 'arquivos';
