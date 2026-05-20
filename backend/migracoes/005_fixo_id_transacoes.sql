-- ============================================
-- Migração: Adicionar fixo_id à tabela transacoes
-- Para rastrear transações geradas automaticamente
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

ALTER TABLE transacoes
  ADD COLUMN fixo_id UUID REFERENCES fixos(id) ON DELETE SET NULL;

-- Índice para busca rápida por fixo_id + data
CREATE INDEX idx_transacoes_fixo_id ON transacoes(fixo_id) WHERE fixo_id IS NOT NULL;
