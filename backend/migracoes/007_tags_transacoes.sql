-- ============================================
-- Migração: Adicionar tags às transações
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

ALTER TABLE transacoes
  ADD COLUMN tags TEXT[] DEFAULT '{}';
