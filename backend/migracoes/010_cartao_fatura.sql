-- Migration 010: Aprimoramento de Cartões de Crédito
-- Adiciona cartao_id nas transações para rastrear gastos por cartão

-- 1. Adicionar cartao_id na tabela transacoes (nullable — retrocompatível)
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES cartoes(id) ON DELETE SET NULL;

-- 2. Índice para performance nas queries de fatura
CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_id ON transacoes(cartao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cartao_mes ON transacoes(cartao_id, data);
