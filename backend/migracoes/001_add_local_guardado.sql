-- ============================================
-- Migração: Adicionar campo "local_guardado" na tabela metas
-- Rode este SQL no SQL Editor do Supabase
-- ============================================

ALTER TABLE metas ADD COLUMN local_guardado TEXT DEFAULT NULL;

-- Exemplos de valores: 'Cofrinho', 'Mercado Pago', 'Santander', 'Nubank', 'PicPay', etc.
