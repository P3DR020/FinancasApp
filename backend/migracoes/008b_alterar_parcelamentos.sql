-- ============================================
-- Migração: Adicionar campos ao parcelamentos
-- Rode este SQL no SQL Editor do Supabase
-- (tabela já existente, só adiciona colunas)
-- ============================================

-- Coluna computada: valor de cada parcela
ALTER TABLE parcelamentos
  ADD COLUMN valor_parcela NUMERIC(12,2) GENERATED ALWAYS AS (valor_total / parcelas_total) STORED;

-- Dia do mês em que a parcela vence
ALTER TABLE parcelamentos
  ADD COLUMN dia_vencimento INTEGER NOT NULL DEFAULT 1 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31);
